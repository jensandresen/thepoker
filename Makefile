APP_NAME=thepoker-engine
TIMER_FILENAME=thepoker.timer
SERVICE_FILENAME=thepoker.service
DIR1=${PWD}
DIR2=${shell PWD}

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

run: update
	@echo "dir 1: $(DIR1)"
	@echo "dir 2: $(DIR2)"
	@echo "dir 3: $(shell PWD)"

	# docker run -t -v ${SERVICES_DIR}:/services -e SERVICES_DIR="/services" -v $(shell PWD)/services.yml:/app/services.yml $(APP_NAME)

test:
	@SERVICES_DIR=${PWD}/test_dir python src/app.py ${PWD}/services.yml
