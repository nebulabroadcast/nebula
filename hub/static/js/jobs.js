function load_jobs(){
    console.log("Reloading jobs table");
    $("#job-table-body tr").remove();
    $.ajax({
        type: "POST",
        url: "/api/jobs",
        data: JSON.stringify({
            "view" : mode,
            "id_asset" : id_asset,
            "fulltext" : fulltext,
            "formatted" : 1
        }),
        processData: false,
        success: function(data){

        rows = data["data"];
        console.log(mode);
        console.log(rows);
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            rid = row["id"];
            rstatus = row["status"];
            rprogress = row["progress"];
            rmessage = row["message"].split("\n")[0]
            rctime = row["ctime"];
            rstime = row["stime"];
            retime = row["etime"];
            rstitle = row["service_title"];
            rtitle = "<a href='/detail/"+ row["id_asset"] +"'>" + row["asset_title"] + "</a>";
            raction = row["action_title"];

            if (rstatus == 1){
                progress = "<div class=\"progress\"><div class=\"progress-bar\" role=\"progressbar\" style=\"width: "+ rprogress +"%\"></div></div>";
            } else if (rstatus == 0 || rstatus == 5){
                progress = "<i class=\"fas fa-sync-alt\"></i>";
            } else if (rstatus == 3 || rstatus == 4){
                progress = "<i class=\"fas fa-times\"></i>";
            } else if (rstatus == 2 || rstatus == 6){
                progress = "<i class=\"fas fa-check\"></i>";
            }

            buttons = "<div class=\"btn-group\" role=\"group\">"

            //TODO: if status in [0,5], disable button
            buttons +=
            "<button type=\"button\" data-href=\"" + rid + "\" class=\"job-restart-button btn btn-success btn-sm\"><i class=\"fas fa-sync-alt\"></i></button>";

            //TODO: if status in [2,3,4,6] disable button
            buttons +=
            "<button type=\"button\" data-href=\"" + rid + "\" class=\"job-abort-button btn btn-danger btn-sm\"><i class=\"fas fa-times\"></i></button>";
            buttons += "</div>"

            $("#job-table-body").append(
                '<tr data-href="' + rid + '"data-status="' + rstatus +'"><td>'
                    + rtitle +
                '</td><td>'
                    + raction +
                '</td><td>'
                    + rctime +
                '</td><td>'
                    + rstime +
                '</td><td>'
                    + retime +
                '</td><td>'
                    + rstitle +
                '</td><td>'
                    + progress +
                '</td><td class="job-message">'
                    + rmessage +
                '<td>' + buttons + '</td></tr>'
            );
        }

        },
        contentType: "application/json",
        dataType: "json"
    });

}


function seismic_handler(data){
	method = data[3];
	params = data[4];
	if (mode == "active" && !id_asset && method == "job_progress"){
        var table_changed = false;

        $("#job-table-body tr").each(function(){
            if ($(this).attr("data-href") == params["id"]) {
                $(".progress-bar", this).css("width", params["progress"] +"%");
                $(".job-message", this).html(params["message"].split("\n")[0]);

                if ($(this).attr("data-status") != params["status"])
                    table_changed = true;
            }
        });

        //TODO: reload if there are new jobs

        if (table_changed)
            load_jobs();
	} //method == job_progress

} //seismic_handler


$(document).ready(function() {
    if (window.history.replaceState) {
        window.history.replaceState( null, null, window.location.href );
    }

    $("#btn-clear").click(function(event){
        event.preventDefault();
        $("#input-query").val("");
        $("#form-search").submit();
    });

    $("#btn-search").click(function(event){
        event.preventDefault();
        $("#form-search").submit
    });

    $(".btn-sendto").click(function() {
        $("#input-id-action").val($(this).attr("data-href"));
        $("#form-sendto").submit();
    });

    load_jobs();

    notify = new seismicNotify(site_name, seismic_handler);

    $("#job-table").on("click", ".job-restart-button", function(){
        $.ajax({
            type: "POST",
            url: "/api/jobs",
            data: JSON.stringify({"restart" : [$(this).attr("data-href")]}),
            processData: false,
            success: function(data){ window.location.href = '/jobs/active';},
            contentType: "application/json",
            dataType: "json"
        });
    });

    $("#job-table").on("click", ".job-abort-button", function(){
        $.ajax({
            type: "POST",
            url: "/api/jobs",
            data: JSON.stringify({"abort" : [$(this).attr("data-href")]}),
            processData: false,
            success: function(data){ window.location.href = '/jobs/active';},
            contentType: "application/json",
            dataType: "json"
        });
    });


});
