APP_NAME=thepoker-engine
TIMER_FILENAME=thepoker.timer
SERVICE_FILENAME=thepoker.service

build:
	docker build -t $(APP_NAME) .

setup: build
	sudo cp scripts/$(TIMER_FILENAME) /etc/systemd/system/
	sudo bash -c 'cat scripts/$(SERVICE_FILENAME) | sed "s:{{path-placeholder}}:${PWD}/make run:g" > /etc/systemd/system/$(SERVICE_FILENAME)'
	sudo systemctl daemon-reload
	sudo systemctl enable --now $(TIMER_FILENAME)

run:
	@docker run --rm -d \
		--restart unless-stopped \
		-v ${SERVICES_DIR}:/services
		-e SERVICES_DIR="/services"
		$(APP_NAME)

test:
	@SERVICES_DIR=${PWD}/test_dir python src/app.py ${PWD}/services.yml