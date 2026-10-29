/** Unit-check getPreferredLANHost against the live machine interfaces. */
import icecastService from '../src/services/IcecastService.js';

const live = icecastService.getPreferredLANHost();
console.log('fresh scan (no saved hostname):', live);

icecastService.hostname = '192.168.1.244'; // stale IP from the old router
console.log('stale saved 192.168.1.244  ->', icecastService.getPreferredLANHost());

icecastService.hostname = live; // saved value IS current
console.log('valid saved ' + live + ' ->', icecastService.getPreferredLANHost());

const pass = live === '192.168.55.113'
  && icecastService.getPreferredLANHost() === '192.168.55.113'
  && (icecastService.hostname = '192.168.1.244', icecastService.getPreferredLANHost()) === '192.168.55.113';
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
