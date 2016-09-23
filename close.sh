#!/bin/bash

for socket in "$@"
do
	python switch.py $socket
	sleep 0.3
done
