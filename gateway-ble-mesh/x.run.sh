#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0); pwd)
PARENT_DiR=$(dirname $SCRIPT_DIR)
echo "SCRIPT_DIR:=${SCRIPT_DIR}"
echo "PARENT_DiR:=${PARENT_DiR}"
docker stop ${DOCKER_MAME}
docker run -it \
  -v /etc/group:/etc/group:ro \
  -v /etc/passwd:/etc/passwd:ro \
  -v /dev/shm/:/dev/shm/ \
  -v ${PARENT_DiR}:${PARENT_DiR} \
  -v ${SCRIPT_DIR}:${SCRIPT_DIR} \
  -v ${HOME}:${HOME} \
  -u $(id -u $USER):$(id -g $USER) \
  -w ${SCRIPT_DIR} \
  --net host \
  --memory=256M \
  --cpu-shares=128 \
  node:lts /bin/bash
