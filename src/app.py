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

    service_configurations = load_services_configuration(configuration_filename)

    for service_name, configuration in service_configurations.items():
        os.chdir(services_root)
        service_dir = os.path.join(services_root, service_name)

        if os.path.isdir(service_dir):
            update_service(service_dir, service_name, configuration)
        else:
            create_service(service_dir, service_name, configuration)

def load_services_configuration(filename):
    with open(filename, 'r') as stream:
        configuration = yaml.safe_load(stream)
        return configuration['services']

def get_configuration_filename():
    configuration_filenames = sys.argv[1:]
    if len(configuration_filenames) == 0:
        return None
    else:
        return configuration_filenames[0]

def create_service(service_root, name, properties):
    print('create service ' + name)

    print('  building folder structure:')

    print('    creating service dir ' + service_root + '...')
    os.mkdir(service_root)

    app_root = os.path.join(service_root, properties['appDir'])
    print('    cloning repository into app dir "' + app_root + '"...')
    run('git clone -q ' + properties['repository'] + ' ' + app_root)

    data_root = os.path.join(service_root, properties['dataDir'])
    print('    creating data dir "' + data_root + '"...')
    os.mkdir(data_root)

    print('  executing commands:')

    setup_command = properties['setupCommand']
    if setup_command:
        print('    setup ("' + setup_command + '")...')
        run(setup_command)

    run_command = properties['runCommand']
    if run_command:
        print('    run ("' + run_command + '")...')
        run(run_command)
    else:
        print('error! no "run command" has been specified for service "' + name + '"!')

def update_service(service_root, name, properties):
    print('update service ' + name)

    app_root = os.path.join(service_root, properties['appDir'])
    data_root = os.path.join(service_root, properties['dataDir'])

    os.chdir(app_root)

    # download repository changes
    print('  fetching repository origin...')
    run('git fetch -q origin master')

    # check for any new commits
    has_changes = run('git log --pretty=format:%H -1 ..origin/master')

    if has_changes:
        print('  changes detected')

        # run teardown        
        teardown_command = properties['teardownCommand']
        print('    executing teardown command ("' + teardown_command + '")...')
        run(teardown_command)

        # update repository
        print('  update repository...')
        run('git merge -q --ff origin/master')

        # run the run command
        run_command = properties['runCommand']
        print('    executing run command ("' + run_command + '")...')
        run(run_command)
    else:
        print('  no changes detected')

def run(command):
    with os.popen(command) as stream:
        return stream.read()

if __name__ == '__main__': main()