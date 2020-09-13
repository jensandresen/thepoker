const {
  readYamlFile,
  isdir,
  run,
  mkdir,
  gitClone,
  chdir,
  gitFetchChanges,
  gitMerge,
  hasGitRepositoryChanged,
} = require("./utils");
const runCommand = require("./command-processor");
const path = require("path");

const repositoryDirName = "_repository";
const manifestFileName = "pokermanifest.yml";

class ServiceDefinition {
  constructor(id, repositoryUrl, serviceDir) {
    this.id = id;
    this.repositoryUrl = repositoryUrl;
    this.serviceDir = serviceDir;
    this.repositoryDir = path.join(this.serviceDir, repositoryDirName);

    this.currentManifest = null;

    this.status = "initializing...";

    this.getManifest = this.getManifest.bind(this);
    this.loadManifest = this.loadManifest.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.createService = this.createService.bind(this);
    this.createOrUpdate = this.createOrUpdate.bind(this);
  }

  async loadManifest() {
    const filePath = path.join(this.repositoryDir, manifestFileName);
    const content = await readYamlFile(filePath);

    if (content && content.configuration) {
      this.currentManifest = {
        ...{
          serviceName: this.id,
          containerName: this.id,
        },
        ...content.configuration,
      };
    } else {
      throw new Error(`Unable to read manifest in repository at "${filePath}"`);
    }
  }

  async getManifest() {
    if (this.currentManifest == null) {
      await this.loadManifest();
    }

    return this.currentManifest;
  }

  updateStatus(newStatus) {
    this.status = newStatus;
  }

  async createService() {
    console.group(`create service ${this.id}:`);

    // build folder structure
    console.group("building folder structure:");

    console.log(`creating dir ${this.serviceDir}...`);
    await mkdir(this.serviceDir);

    console.log(`cloning source repository into "${this.repositoryDir}"...`);
    await gitClone(this.repositoryUrl, this.repositoryDir);

    console.log("loading service manifest...");
    const manifest = await this.getManifest();

    const directories = manifest.directories || {};
    for (let dirName in directories) {
      const dataDir = path.join(this.serviceDir, dirName);
      console.log(`creating "${dirName}" dir "${dataDir}"...`);
      await mkdir(dataDir);
    }

    console.groupEnd();

    // execute commands
    console.group("executing commands:");

    await chdir(this.repositoryDir);
    console.log(`cwd: ${this.repositoryDir}`);

    this.updateStatus("executing setup");
    await runCommand(this, "setup");

    this.updateStatus("executing run");
    await runCommand(this, "run");
    console.groupEnd();

    this.updateStatus("should be running...");
    console.log(`status: ${this.status}`);

    console.groupEnd();
  }

  async updateService() {
    console.group(`update service ${this.id}`);

    const repositoryDir = this.repositoryDir;
    await chdir(repositoryDir);

    // download repository changes
    console.log("fetching repository origin...");
    await gitFetchChanges();

    // check for changes
    if (await hasGitRepositoryChanged()) {
      console.log("changes detected");

      // load current/old service manifest
      let manifest = await this.getManifest();

      // first teardown
      console.group("executing teardown:");
      console.log(`cwd: ${repositoryDir}`);
      this.updateStatus("executing teardown");
      await runCommand(this, "teardown");
      console.groupEnd();

      // update repository
      console.log("update repository...");
      await gitMerge();

      // load NEW service manifest
      await this.loadManifest();
      manifest = await this.getManifest();

      // creating missing directories
      const directories = manifest.directories || {};
      for (let dirName in directories) {
        const dirPath = path.join(this.serviceDir, dirName);
        if (!(await isdir(dirPath))) {
          console.log(`creating "${dirName}" dir "${dirPath}"...`);
          await mkdir(dirPath);
        }
      }

      // run setup
      console.group("executing setup:");
      console.log(`cwd: ${repositoryDir}`);
      this.updateStatus("executing setup");
      await runCommand(this, "setup");
      console.groupEnd();

      // run the run command
      console.group("executing run:");
      console.log(`cwd: ${repositoryDir}`);
      this.updateStatus("executing run");
      await runCommand(this, "run");
      console.groupEnd();

      this.updateStatus("should be running...");
    } else {
      console.log("no changes detected");
    }

    console.groupEnd();
  }

  async createOrUpdate() {
    if (await isdir(this.serviceDir)) {
      await this.updateService();
    } else {
      await this.createService();
    }
  }

  static async buildFrom(serviceDir) {
    const id = path.basename(serviceDir);

    const repositoryDir = path.join(serviceDir, repositoryDirName);
    if (!(await isdir(repositoryDir))) {
      throw new Error(
        `Error! Service repository has not been initialized as expected in "${repositoryDir}".`
      );
    }

    let url = await run(`(cd ${repositoryDir} && git remote get-url origin)`);
    url = (url || "").trim();

    if (url == "" || url.startsWith("fatal: ")) {
      throw new Error(
        `Error! Unable to get url of repository origin in "${repositoryDir}".`
      );
    }

    return new ServiceDefinition(id, url, serviceDir);
  }
}

module.exports = ServiceDefinition;
