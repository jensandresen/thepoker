#!/bin/bash

cd ../src

pyenv -m venv env
source env/bin/activate

pip install -r requirements.txt
python app.py ${PWD}/../services.yml

deactivate
