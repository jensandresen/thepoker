APP_NAME=thepoker-engine

build:
	docker build -t $(APP_NAME) .

setup: build

update:
	git clean -df
	git pull

run: # update build
	docker run -d \
		--rm \
		--name ${APP_NAME} \
		--restart unless-stopped \
		-p 5900:3000 \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v ${SERVICES_DIR}:/services \
		-e SERVICES_DIR="/services" \
		-e HOST_SERVICES_DIR="${SERVICES_DIR}" \
		-v $(abspath ./services.yml):/app/services.yml \
		$(APP_NAME)

clean-test-dir:
	rm -Rf test_dir && mkdir test_dir

test:
	@cd src && SERVICES_DIR=${PWD}/test_dir HOST_SERVICES_DIR=${PWD}/test_dir DRY_RUN=1 npm run start:engine -- ../services.yml

test-full:
	@cd src && SERVICES_DIR=${PWD}/test_dir HOST_SERVICES_DIR=${PWD}/test_dir DRY_RUN=1 npm run start -- ../services.yml

fresh-test: clean-test-dir test