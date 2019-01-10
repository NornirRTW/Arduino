/**
 * Created by pdrevland on 18.07.16.
 */


function parseData(data) {
    var values = {};
    for (var i = 0; i < object.expected.length; i++) {
        var node = object.expected[i].toUpperCase();
        var el = data.getElementsByTagName(node)[0];
        values[node] = el.innerHTML;
        expected[node].onChange(el.innerHTML);
    }
    postMessage(values);
}
onmessage = function (data) {
    var rtws = data.data.doc.getElementsByTagName("RTW") || null;
    var rtw;
    for (var i = 0; i < rtws.length; i++) {
        rtw = rtws[i];
        if (rtw && rtw.hasChildNodes()) {
            parseData(rtw);
        }
    }
}
