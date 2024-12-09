
//Wiring code generated from an ArduinoML model
// Application name: RedButton

long debounce = 200;
enum STATE {off, on};

STATE currentState = off;

bool buttonBounceGuard = false;
long buttonLastDebounceTime = 0;

            

	void setup(){
		pinMode(13, OUTPUT); // red_led [Actuator]
		pinMode(2, INPUT); // button [Sensor]
	}
	void loop() {
			switch(currentState){

				case off:
					digitalWrite(13,LOW);
		 			buttonBounceGuard = millis() - buttonLastDebounceTime > debounce;
					if( digitalRead(2) == HIGH && buttonBounceGuard) {
						buttonLastDebounceTime = millis();
						currentState = on;
					}
		
				break;
				case on:
					digitalWrite(13,HIGH);
		 			buttonBounceGuard = millis() - buttonLastDebounceTime > debounce;
					if( digitalRead(2) == HIGH && buttonBounceGuard) {
						buttonLastDebounceTime = millis();
						currentState = off;
					}
		
				break;
		}
	}
	
