const { readYamlFile, writeYamlFile } = require("./utils");
const path = require("path");

const strategies = [
  () => process.argv[2] || "",
  () => process.env.SERVICE_CONFIG_FILE || "",
  () => "./services.yml",
];

const fileName = strategies.map((x) => x().trim()).find((x) => x != "");
const configFilePath = path.resolve(fileName);

async function readConfiguration() {
  const cfg = await readYamlFile(configFilePath);
  return transformConfiguration(cfg);
}

function transformConfiguration(configuration) {
  const result = [];

  const services = configuration.services;
  for (let serviceId in services) {
    const definition = services[serviceId];
    result.push({ ...{ id: serviceId }, ...definition });
  }

  return result;
}

async function writeConfiguration(configurations) {
  const services = {};

  configurations.forEach((cfg) => {
    const temp = { ...cfg };
    delete temp.id;
    services[cfg.id] = temp;
  });

  await writeYamlFile(configFilePath, {
    services: services,
  });
}

exports.readConfiguration = readConfiguration;
exports.writeConfiguration = writeConfiguration;
