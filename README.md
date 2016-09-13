# iot_demo
Making personal iot server

switch.py was based soley off of a script found on instructables: http://www.instructables.com/id/Super-Simple-Raspberry-Pi-433MHz-Home-Automation/?ALLSTEPS

Fibers used to add delays when server gets busy:
https://github.com/laverdet/node-fibers

Uses radio frequency to communicate with devices. Sending data over radio must be done one at a time, thus if a request comes in and the server is still sending out another request's data, the new request will be paused until the server is free again.

