NAME=thepoker-engine
PLATFORM=linux/amd64
CONTAINER_REGISTRY=mondayworks.azurecr.io
BUILD_NUMBER:=latest

.PHONY: build
build: BUILDER=$(NAME)-builder
build:
	-docker buildx create --name $(BUILDER)
	docker buildx build --build-arg build_number=$(BUILD_NUMBER) --platform $(PLATFORM) --builder $(BUILDER) -t $(NAME) . --load
	docker buildx rm $(BUILDER)

.PHONY: deliver
deliver:
	docker tag $(NAME):latest $(CONTAINER_REGISTRY)/$(NAME):$(BUILD_NUMBER)
	docker push $(CONTAINER_REGISTRY)/$(NAME):$(BUILD_NUMBER)

.PHONY: cd
cd: PLATFORM=linux/arm/v7
cd: build deliver

test: 
	docker-compose up --build