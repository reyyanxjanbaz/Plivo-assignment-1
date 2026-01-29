const plivo = require('plivo');
try {
    const response = new plivo.Response();
    console.log('plivo.Response() works');
    console.log(response.toXML());
} catch (e) {
    console.log('plivo.Response() failed:', e.message);
}

try {
    const response = new plivo.xml.Response();
    console.log('plivo.xml.Response() works');
} catch (e) {
    console.log('plivo.xml.Response() failed:', e.message);
}
