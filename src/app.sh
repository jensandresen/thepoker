#!/bin/bash

repository=${INFRASTRUCTURE_REPOSITORY}
data_dir=${DATA_DIR}
interval=${PULL_INTERVAL}
apply_url=${APPLY_URL}

cd $data_dir

git clone $repository .

while true;
do
    echo "Cleaning data dir..."
    git checkout .
    git clean -xfd

    echo "Pulling changes..."
    git pull -r

    echo "Handling each manifest..."
    files=${PWD}/*.yml
    for f in $files
    do
        name=$(basename $f)
        echo "Sending $name to $apply_url..."
        curl -H "Content-Type: text/yaml" --data-binary "@$f" $apply_url
    done

    sleep $interval
done