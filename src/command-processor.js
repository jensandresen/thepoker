const { getHostServicesRoot, run } = require("./utils");
const path = require("path");

async function runCommand(serviceDefinition, commandName) {
  console.group(`command: "${commandName}"`);
  const manifest = await serviceDefinition.getManifest();
  const cmd = manifest.commands[commandName];

  if (cmd) {
    console.group("env:");
    const envVars = buildEnvVarsFrom(serviceDefinition, manifest)
      .map((x) => {
        const entry = `${x.key}=${x.value}`;
        console.log(entry);
        return entry;
      })
      .join(" ");
    console.groupEnd();

    console.group(`cmd: ${cmd}`);
    if (isDryRun()) {
      console.log(`*** DRY RUN MODE ***`);
      console.log(`> ${envVars} ${cmd}`);
    } else {
      await run(`${envVars} ${cmd}`);
    }
    console.groupEnd();
  } else {
    console.log(`no command "${commandName}" was specified in manifest.`);
  }
  console.groupEnd();
}

function buildEnvVarsFrom(serviceDefinition, manifest) {
  const hostServicesRoot = getHostServicesRoot();
  const list = [
    {
      key: "SERVICE_ID",
      value: serviceDefinition.id,
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

  const directories = manifest.directories || {};
  for (let dirName in directories) {
    list.push({
      key: `${dirName.toLocaleUpperCase()}-DIR`,
      value: path.join(
        hostServicesRoot,
        serviceDefinition.id,
        directories[dirName]
      ),
    });
  }

  return list;
}

function isDryRun() {
  const value = (process.env.DRY_RUN || "").trim().toLowerCase();
  return value == "true" || value == "yes" || value == "1";
}

module.exports = runCommand;
