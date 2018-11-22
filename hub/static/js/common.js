(function (window, document, undefined) {
    "use strict";
    if (window.seismicNotify) {
        return;
    }

    var seismicNotify = function(channel, handler) {
        this.channel = channel;
        this.handler = handler;
        this.connect();
    } // Notify.constructor

    seismicNotify.prototype.connect = function() {
        var handler = this.handler;
        var protocol = "ws://";
        if (location.protocol == "https:")
            protocol = "wss://";
        this.socket = new WebSocket(protocol + location.host + "/ws/" + this.channel);
        this.socket.onmessage = function(event){
            var message = JSON.parse(event.data);
            handler(message);
        };
    } // Notify.connect

    window.seismicNotify = seismicNotify;
})(window, document);



$(document).ready(function(){
    setTimeout(function() {
        $(".alert-info").alert('close');
        }, 2000);
    setTimeout(function() {
        $(".alert-warning").alert('close');
    }, 5000);
    setTimeout(function() {
        $(".alert-danger").alert('close');
    }, 10000);

    $(".input-timecode").inputmask({"mask": "99:99:99:99", "insertMode" : false});

});
