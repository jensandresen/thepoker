const { readYamlFile } = require("./utils");
const path = require("path");

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
  for (let serviceId in services) {
    const definition = services[serviceId];
    result.push({ ...{ id: serviceId }, ...definition });
  }

  return result;
}

module.exports = readConfiguration;
