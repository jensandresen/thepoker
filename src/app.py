import os
import sys
import yaml

def main():
    configuration_filename = get_configuration_filename()
    if not configuration_filename:
        print('No configuration file has been specified.')
        quit()

    services_root = os.environ.get('SERVICES_DIR')
    if not services_root:
        print('No services dir has been specified.')
        quit()

    host_services_root = os.environ.get('HOST_SERVICES_DIR')
    if not services_root:
        print('No host services dir has been specified.')
        quit()

    service_configurations = load_services_configuration(configuration_filename)

    for service_name, configuration in service_configurations.items():
        os.chdir(services_root)
        service_dir = os.path.join(services_root, service_name)
        host_service_dir = os.path.join(host_services_root, service_name)

        if os.path.isdir(service_dir):
            update_service(host_service_dir, service_dir, service_name, configuration)
        else:
            create_service(host_service_dir, service_dir, service_name, configuration)

def get_configuration_filename():
    configuration_filenames = sys.argv[1:]
    if len(configuration_filenames) == 0:
        return None
    else:
        return configuration_filenames[0]

def load_services_configuration(filename):
    with open(filename, 'r') as stream:
        configuration = yaml.safe_load(stream)
        return configuration['services']

def load_service_manifest(source_root):
    filename = os.path.join(source_root, "pokermanifest.yml")
    content = read_yaml_file(filename)
    return content['configuration']

def create_service(host_service_root, service_root, name, properties):
    print('create service ' + name)

    print('  building folder structure:')

    # create service root dir
    print('    creating service dir ' + service_root + '...')
    os.mkdir(service_root)

    # clone source into service dir
    repository_dir = os.path.join(service_root, '_repository')
    print('    cloning source repository into "' + repository_dir + '"...')
    run('git clone -q ' + properties['repository'] + ' ' + repository_dir)

    # loading service manifest
    print('    loading service manifest...')
    service_manifest = None
    try:
        service_manifest = load_service_manifest(repository_dir)
    except FileNotFoundError:
        print('error! no service manifest was found!')
        return

    # create data dir
    data_root = os.path.join(service_root, service_manifest['directories']['data'])
    print('    creating data dir "' + data_root + '"...')
    os.mkdir(data_root)

    # executing commands
    os.chdir(repository_dir)
    print('  executing commands:')
    print('    cwd: ' + repository_dir)

    env_vars = build_env_vars_from(host_service_root, service_manifest)
    run_command(service_manifest, 'setup', env_vars, '    ')
    run_command(service_manifest, 'run', env_vars, '    ')

def build_env_vars_from(service_root, service_manifest):
    return {
        "DATA_DIR": os.path.join(service_root, service_manifest['directories']['data'])
    }

def run_command(service_manifest, command_name, env_vars, indentation):
    local_indentation = indentation
    print(local_indentation + command_name)

    local_indentation += '  ';

    cmd = service_manifest['commands'][command_name]
    if cmd:
        # print and join env vars
        print(local_indentation + 'env:')
        env_vars_full = ''
        for key, value in env_vars.items():
            new_entry = key + '=' + value
            print(local_indentation + '  ' + new_entry)
            env_vars_full += new_entry + ' '

        print(local_indentation + 'cmd: ' + cmd)
        run(env_vars_full + cmd)
    else:
        print(local_indentation + 'no command "' + command_name + '" was specified')

def update_service(host_service_root, service_root, name, properties):
    print('update service ' + name)

    repository_dir = os.path.join(service_root, '_repository')
    os.chdir(repository_dir)

    # download repository changes
    print('  fetching repository origin...')
    run('git fetch -q origin master')

    # check for any new commits
    has_changes = run('git log --pretty=format:%H -1 ..origin/master')

    if has_changes:
        print('  changes detected')

        # load current/old service manifest
        service_manifest = None
        try:
            service_manifest = load_service_manifest(repository_dir)
        except FileNotFoundError:
            print('error! no service manifest was found!')
            return

        # first, teardown
        print('  executing teardown:')
        print('    cwd: ' + repository_dir)
        env_vars = build_env_vars_from(host_service_root, service_manifest)
        run_command(service_manifest, 'teardown', env_vars, '    ')

        # update repository
        print('  update repository...')
        run('git merge -q --ff origin/master')

        # load NEW service manifest
        try:
            service_manifest = load_service_manifest(repository_dir)
        except FileNotFoundError:
            print('error! no service manifest was found!')
            return
            
        env_vars = build_env_vars_from(host_service_root, service_manifest)

        # run setup
        print('  executing setup:')
        print('    cwd: ' + repository_dir)
        run_command(service_manifest, 'setup', env_vars, '    ')

        # run the run command
        print('  executing run:')
        print('    cwd: ' + repository_dir)
        run_command(service_manifest, 'run', env_vars, '    ')
    else:
        print('  no changes detected')

def run(command):
    with os.popen(command) as stream:
        return stream.read()

def read_yaml_file(filename):
    with open(filename, 'r') as stream:
        return yaml.safe_load(stream)

if __name__ == '__main__': main()