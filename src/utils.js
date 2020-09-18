const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

function run(cmd, showOutput = true) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

function chdir(dir_path) {
  return new Promise((resolve) => {
    process.chdir(dir_path);
    resolve();
  });
}

function mkdir(dir_path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir_path, { recursive: false }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function isdir(dir_path) {
  return new Promise((resolve) => {
    const result = fs.existsSync(dir_path);
    resolve(result);
  });
}

async function gitClone(repositoryUrl, localDir) {
  await run(`git clone -q ${repositoryUrl} ${localDir}`);
}

async function gitMerge() {
  await run("git merge -q --ff origin/master");
}

async function gitFetchChanges() {
  await run("git fetch -q origin master");
}

async function hasGitRepositoryChanged() {
  const result = await run("git log --pretty=format:%H -1 ..origin/master");
  return result.trim() != "";
}

async function readYamlFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "utf8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const result = yaml.parse(data);
        resolve(result);
      }
    });
  });
}

async function writeYamlFile(filePath, instance) {
  return new Promise((resolve) => {
    const data = yaml.stringify(instance);
    fs.writeFile(filePath, data, { encoding: "utf8" }, () => resolve());
  });
}

function getServicesRoot() {
  return (process.env.SERVICES_DIR || "").trim();
}

function getHostServicesRoot() {
  return (process.env.HOST_SERVICES_DIR || "").trim();
}

function getSubDirectories(parentDir) {
  return new Promise((resolve) => {
    fs.readdir(parentDir, (err, entries) => {
      if (err) {
        resolve([]);
      } else {
        const subDirs = entries
          .map((name) => path.join(parentDir, name))
          .filter((dirPath) => fs.statSync(dirPath).isDirectory());
        resolve(subDirs);
      }
    });
  });
}

// exports
exports.run = run;
exports.chdir = chdir;
exports.mkdir = mkdir;
exports.isdir = isdir;
exports.gitClone = gitClone;
exports.gitMerge = gitMerge;
exports.gitFetchChanges = gitFetchChanges;
exports.hasGitRepositoryChanged = hasGitRepositoryChanged;
exports.readYamlFile = readYamlFile;
exports.writeYamlFile = writeYamlFile;
exports.getServicesRoot = getServicesRoot;
exports.getHostServicesRoot = getHostServicesRoot;
exports.getSubDirectories = getSubDirectories;
