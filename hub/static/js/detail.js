function save_asset() {
    console.log("Saving asset");
    if ($("#input-duration").val() != $("#input-form-duration").val()){
        $("#input-form-duration").val($("#input-duration").val());
        console.log("changing duration to", $("#input-form-duration").val());
    }
    $("#form-edit").submit();
}


$(document).ready(function(){

    if (window.history.replaceState) {
        window.history.replaceState( null, null, window.location.href );
    }

    $(".datepicker").each(function(){
            $(this).datepicker({
            modal: true,
            uiLibrary: 'bootstrap4',
            iconsLibrary: 'fontawesome',
            format: 'yyyy-mm-dd',
            weekStartDay: 1,
        });

    });

    $("#button-save").click(function(){
        save_asset();
    });

    $(".btn-qcstate").click(function(){
        console.log("set qc/state to " + $(this).attr("data-href"));
        $("#input-form-qc-state").val($(this).attr("data-href"));
        save_asset();
    });

    $(".btn-sendto").click(function() {
        $("#input-id-action").val($(this).attr("data-href"));
        $("#form-sendto").submit();
    });



    if (allow_upload){
        var r = new Resumable({
            target : '/upload',
            query : {id_asset : id_asset}
        });

        r.assignBrowse(document.getElementById('button-upload'));

        r.on('fileAdded', function(file, event){
            console.log('fileAdded', event);
            r.upload();
        });

        r.on('uploadStart', function(){
            $("#upload-status").show();
            $("#upload-status").removeClass().addClass("alert alert-info");
            $("#upload-status-text").html("Upload started");
            $("#upload-progress .progress-bar").css("width", "0");
            $("#upload-progress").show();
        });

        r.on('fileProgress', function(file){
            $("#upload-status-text").html("Uploading...");
            $("#upload-progress .progress-bar").css("width", (r.progress()*100) + "%");
        });

        r.on('fileSuccess', function(file){
            console.log('fileSuccess',file);
            $("#upload-status").removeClass().addClass("alert alert-success");
            $("#upload-status-text").html("Upload completed");
            $("#upload-progress").hide();

        });

        r.on('fileError', function(file, message){
            console.log(message);
            var data = JSON.parse(message);
            $("#upload-status").removeClass().addClass("alert alert-danger");
            $("#upload-status-text").html("Upload failed: " + data["message"]);
            $("#upload-progress").hide();
        });
    }

});


$(document).keydown(function(event) {
        if((event.ctrlKey || event.metaKey) && event.which == 83) {
            save_asset();
            event.preventDefault();
            return false;
        }
    }
);
