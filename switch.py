import time
import sys
import RPi.GPIO as GPIO

a_on = '0001010001010101001100110'
a_off = '0001010001010101001111000'
b_on = '0001010001010101110000110'
b_off = '0001010001010101110011000'
short_delay = 0.0002
long_delay = 0.0005
extended_delay = 0.005

NUM_ATTEMPTS = 10
TRANSMIT_PIN = 26

def transmit_code(code):
    print "Transmitting"
    '''Transmit a chosen code string using the GPIO transmitter'''
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(TRANSMIT_PIN, GPIO.OUT)
    for t in range(NUM_ATTEMPTS):
        for i in code:
            if i == '0':
                GPIO.output(TRANSMIT_PIN, 1)
                time.sleep(short_delay)
                GPIO.output(TRANSMIT_PIN, 0)
                time.sleep(long_delay)
            elif i == '1':
                GPIO.output(TRANSMIT_PIN, 1)
                time.sleep(long_delay)
                GPIO.output(TRANSMIT_PIN, 0)
                time.sleep(short_delay)
            else:
                continue
        GPIO.output(TRANSMIT_PIN, 0)
        time.sleep(extended_delay)
    GPIO.cleanup()

if sys.argv[1] == 'a_on':
	transmit_code(a_on)
elif sys.argv[1] == 'a_off':
	transmit_code(a_off)
elif sys.argv[1] == 'b_on':
	transmit_code(b_on)
elif sys.argv[1] == 'b_off':
	transmit_code(b_off)
