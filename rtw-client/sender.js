/**
 * Created by pdrevland on 18.07.16.
 */
onmessage = function(sendObject) {
    var url = sendObject.data.url;
    var sendPost = sendObject.data.sendPost;
    var synxCat = sendObject.data.synxCat;
    var readyState = sendObject.data.readyState;
    var retries = 0;
    var timeOut;
    function retry() {
        console.log("Retry: " + retries);
        if (retries < 6) {
            var sendMessage = new XMLHttpRequest();
            sendMessage.onreadystatechange = function() {
               console.log(sendMessage.readyState);
                if (sendMessage.readyState === readyState) {
                    clearTimeout(timeOut);
                    postMessage(sendMessage.responseText);
                }
            };

            sendMessage.open("POST", url, true);
            // sendMessage.setRequestHeader("Access-Control-Allow-Origin", "*");
            sendMessage.setRequestHeader("Synx-Cat", synxCat);
            sendMessage.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            timeOut = setTimeout( function() {
                retry();
            }, 2500);
            //console.log(sendPost);
            sendMessage.send(sendPost);

        }
        else {
            console.log("Timedout");
            console.log(sendPost);
            postMessage({err: "Timedout"})
        }
        retries++;
    }
    console.log(sendObject.data);
    retry();

};