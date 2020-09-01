APP_NAME=thepoker-engine
TIMER_FILENAME=thepoker.timer
SERVICE_FILENAME=thepoker.service

build:
	docker build -t $(APP_NAME) .

install-timer:
	sudo cp scripts/$(TIMER_FILENAME) /etc/systemd/system/
	sudo bash -c 'cat scripts/$(SERVICE_FILENAME) | sed "s:{{path-placeholder}}:${PWD}:g" > /etc/systemd/system/$(SERVICE_FILENAME)'
	sudo systemctl daemon-reload
	sudo systemctl enable --now $(TIMER_FILENAME)

setup: build install-timer

update:
	git clean -df
	git pull

run: update build
	docker run -t -v ${SERVICES_DIR}:/services -e SERVICES_DIR="/services" -v $(abspath ./services.yml):/app/services.yml $(APP_NAME)

test:
	@SERVICES_DIR=${PWD}/test_dir python src/app.py ${PWD}/services.yml

clean-test-dir:
	rm -Rf test_dir && mkdir test_dir

fresh-test: clean-test-dir test