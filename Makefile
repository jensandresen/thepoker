TIMER_FILENAME=thepoker.timer
SERVICE_FILENAME=thepoker.service

setup:
	sudo cp scripts/${TIMER_FILENAME} /etc/systemd/system/
	sudo bash -c 'cat scripts/${SERVICE_FILENAME} | sed "s:{{path-placeholder}}:${PWD}/make run:g" > /etc/systemd/system/${SERVICE_FILENAME}'
	sudo systemctl daemon-reload
	sudo systemctl enable --now ${TIMER_FILENAME}

run:
	python src/app.py ${PWD}/services.yml

test:
	@SERVICES_DIR=${PWD}/test_dir python src/app.py ${PWD}/services.yml