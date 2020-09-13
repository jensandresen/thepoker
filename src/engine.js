const {
  chdir,
  run,
  getSubDirectories,
  getServicesRoot,
  getHostServicesRoot,
} = require("./utils");

const moment = require("moment");
const path = require("path");
const readConfiguration = require("./configuration-reader");
const ServiceDefinition = require("./service-definition");

const appDir = path.resolve(__dirname);

const state = {
  nextRun: null,
  status: "waiting",
  services: [],
};

async function main() {
  await restoreServiceState();

  updateNextRun();
  await execute();

  // start service status updater - every 15 sec
  setInterval(updateStatusOnAllServices, 1000 * 15);

  // timer - every 5 min
  setInterval(async () => {
    updateNextRun();
    await execute();
  }, 1000 * 60 * 5);
}

function updateNextRun() {
  state.nextRun = moment().add(5, "minutes").toDate();
}

// restore service state from disk
async function restoreServiceState() {
  const servicesRoot = getServicesRoot();
  const services = await getSubDirectories(servicesRoot);

  services.forEach(async (serviceDir) => {
    const serviceDefinition = await ServiceDefinition.buildFrom(serviceDir);
    state.services.push(serviceDefinition);
    console.log(`Restored service definition for "${serviceDefinition.id}".`);
  });
}

async function updateStatusOnAllServices() {
  const result = await run("docker ps -a --format '{{.Names}}'", false);
  const containerNames = result.trim().split("\n");

  // update status on registered services
  state.services.forEach((x) => {
    const name = x.getManifest().containerName;
    x.status = containerNames.includes(name) ? "running" : "not running";
  });
}

async function execute() {
  try {
    state.status = "running";
    console.log("Running...");
    await loop();
  } catch (error) {
    console.log("Error! ", error);
  }

  state.status = "waiting";
}

async function loop() {
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

  // update service list with new entries from configuration file
  configuration
    .filter((service) => !state.services.find((x) => x.id == service.id))
    .forEach((service) => {
      const serviceDir = path.join(local_services_root, service.id);
      state.services.push(
        new ServiceDefinition(service.id, service.repository, serviceDir)
      );
    });

  state.services.forEach(async (serviceDefinition) => {
    await chdir(local_services_root);
    await serviceDefinition.createOrUpdate();
  });
}

main();

// exports
exports.getNextRun = () => state.nextRun;
exports.getStatus = () => state.status;
exports.getServices = () => state.services;
