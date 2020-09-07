const {
  readYamlFile,
  chdir,
  isdir,
  mkdir,
  gitClone,
  run,
  gitFetchChanges,
  hasGitRepositoryChanged,
} = require("./utils");
const moment = require("moment");
const path = require("path");

const appDir = path.resolve(__dirname);

const state = {
  nextRun: null,
  status: "waiting",
  services: [],
};

function updateServiceDefinition(configuration, manifest) {
  const id = configuration.name;
  const service = state.services.find((x) => x.id == id);

  if (service) {
    service.configuration = configuration;
    service.manifest = manifest;
  } else {
    state.services.push({
      id: id,
      status: "initializing",
      configuration: configuration,
      manifest: manifest,
    });
  }
}

function updateServiceStatus(serviceId, newStatus) {
  const service = state.services.find((x) => x.id == serviceId);
  if (!service) {
    console.log(
      `warning! could not update service "${serviceId}" with status "${newStatus}" because it has not been registered.`
    );
    return;
  }

  service.status = newStatus;
}

async function main() {
  await chdir(appDir);

  const local_services_root = getServicesRoot();
  if (local_services_root == "") {
    throw new Error(
      "Local service directory not defined as environment variable."
    );
  }

  const host_services_root = getHostServicesRoot();
  if (host_services_root == "") {
    throw new Error(
      "Host service directory not defined as environment variable."
    );
  }

  const configuration = await readConfiguration();
  if (!configuration) {
    throw new Error("Unable to find a configuration file.");
  }

  configuration.forEach(async (service) => {
    await chdir(local_services_root);

    const service_dir = path.join(local_services_root, service.name);
    if (await isdir(service_dir)) {
      await updateService(service_dir, service);
    } else {
      await createService(service_dir, service);
    }
  });
}

function getServicesRoot() {
  return (process.env.SERVICES_DIR || "").trim();
}

function getHostServicesRoot() {
  return (process.env.HOST_SERVICES_DIR || "").trim();
}

async function readConfiguration() {
  const strategies = [
    () => process.argv[2] || "",
    () => process.env.SERVICE_CONFIG_FILE || "",
    () => "./services.yml",
  ];

  for (let i in strategies) {
    const fileName = strategies[i]().trim();
    if (fileName != "") {
      const fullFilePath = path.resolve(fileName);
      const cfg = await readYamlFile(fullFilePath);
      return transformConfiguration(cfg);
    }
  }

  return null;
}

function transformConfiguration(configuration) {
  const result = [];

  const services = configuration.services;
  for (let serviceName in services) {
    const definition = services[serviceName];
    result.push({ ...{ name: serviceName }, ...definition });
  }

  return result;
}

async function readServiceManifest(configuredServiceName, repositoryDir) {
  const filePath = path.join(repositoryDir, "pokermanifest.yml");
  const content = await readYamlFile(filePath);

  if (content && content.configuration) {
    return {
      ...{
        serviceName: configuredServiceName,
        containerName: configuredServiceName,
      },
      ...content.configuration,
    };
  }

  throw new Error("Unable to read manifest in repository.");
}

function buildEnvVarsFrom(manifest) {
  const hostServicesRoot = getHostServicesRoot();
  return [
    {
      key: "DATA_DIR",
      value: path.join(hostServicesRoot, manifest.directories.data),
    },
    {
      key: "SERVICE_NAME",
      value: manifest.serviceName,
    },
    {
      key: "CONTAINER_NAME",
      value: manifest.containerName,
    },
  ];
}

async function runCommand(manifest, commandName) {
  console.log(`   ${commandName}`);
  const cmd = manifest.commands[commandName];

  if (cmd) {
    console.log("    env:");
    const envVars = buildEnvVarsFrom(manifest)
      .map((x) => {
        const entry = `${x.key}=${x.value}`;
        console.log(`      ${entry}`);
        return entry;
      })
      .join(" ");

    console.log(`    cmd: ${cmd}`);
    if (isDryRun()) {
      console.log(`    *** DRY RUN MODE ***`);
      console.log(`    > ${envVars} ${cmd}`);
    } else {
      const output = await run(`${envVars} ${cmd}`);
      console.log("    output: ", output);
    }
  } else {
    console.log(`   no command "${commandName}" was specified`);
  }
}

function isDryRun() {
  const value = (process.env.DRY_RUN || "").trim().toLowerCase();
  return value == "true" || value == "yes" || value == "1";
}

async function createService(serviceDir, configuration) {
  console.log(`create service ${configuration.name}`);

  console.log("  building folder structure:");

  // create service root dir
  console.log(`    creating service dir ${serviceDir}...`);
  await mkdir(serviceDir);

  // clone source into service dir
  const repositoryDir = path.join(serviceDir, "_repository");
  console.log(`   cloning source repository into "${repositoryDir}"...`);
  await gitClone(configuration.repository, repositoryDir);

  // load manifest
  console.log("    loading service manifest...");
  const manifest = await readServiceManifest(configuration.name, repositoryDir);

  // create data dir
  const dataDir = path.join(serviceDir, manifest.directories.data);
  console.log(`    creating data dir "${dataDir}"...`);
  mkdir(dataDir);

  updateServiceDefinition(configuration, manifest);

  // execute commands
  await chdir(repositoryDir);
  console.log("  executing commands:");
  console.log(`   cwd: ${repositoryDir}`);

  updateServiceStatus(configuration.name, "executing setup");
  await runCommand(manifest, "setup");

  updateServiceStatus(configuration.name, "executing run");
  await runCommand(manifest, "run");

  updateServiceStatus(configuration.name, "should be running...");
}

async function updateService(serviceDir, configuration) {
  console.log(`update service ${configuration.name}`);

  const repositoryDir = path.join(serviceDir, "_repository");
  await chdir(repositoryDir);

  // download repository changes
  console.log("  fetching repository origin...");
  await gitFetchChanges();

  // check for changes
  if (await hasGitRepositoryChanged()) {
    console.log("  changes detected");

    // load current/old service manifest
    let manifest = await readServiceManifest(configuration.name, repositoryDir);

    // first teardown
    console.log("  executing teardown:");
    console.log(`    cwd: ${repositoryDir}`);
    updateServiceStatus(configuration.name, "executing teardown");
    await runCommand(manifest, "teardown");

    // update repository
    console.log("  update repository...");
    await gitFetchChanges();

    // load NEW service manifest
    manifest = await readServiceManifest(configuration.name, repositoryDir);

    updateServiceDefinition(configuration, manifest);

    // run setup
    console.log("  executing setup:");
    console.log(`    cwd: ${repositoryDir}`);
    updateServiceStatus(configuration.name, "executing setup");
    await runCommand(manifest, "setup");

    // run the run command
    console.log("  executing run:");
    console.log(`    cwd: ${repositoryDir}`);
    updateServiceStatus(configuration.name, "executing run");
    await runCommand(manifest, "run");

    updateServiceStatus(configuration.name, "should be running...");
  } else {
    console.log("  no changes detected");
  }
}

function updateNextRun() {
  state.nextRun = moment().add(5, "minutes").toDate();
}

// timer loop
async function main_loop() {
  try {
    state.status = "running";
    console.log("Running...");
    await main();
  } catch (error) {
    console.log("Error! ", error);
  }

  state.status = "waiting";
}

function shouldRun() {
  return (
    state.status != "running" && moment().isSameOrAfter(state.nextRun, "second")
  );
}

// timer
setInterval(async () => {
  if (shouldRun()) {
    updateNextRun();
    await main_loop();
  }
}, 1000);

updateNextRun();
main_loop();

// update status on registered services
setInterval(async () => {
  const result = await run("docker ps -a --format '{{.Names}}'");
  const containerNames = result.trim().split("\n");

  state.services.forEach((x) => {
    const name = x.manifest.containerName;
    x.status = containerNames.includes(name) ? "running" : "not running";
  });
}, 1000 * 15);

// exports
exports.getNextRun = () => state.nextRun;
exports.getStatus = () => state.status;
exports.getServices = () => state.services;
