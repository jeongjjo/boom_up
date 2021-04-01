function onProfile(id) {
    location.href = '/profile/main/' + id;
}

function onVote(obj, type, id, kind) {
    //todo 권한 
    $.ajax({
        type: 'PUT',
        url: '/voting/' + id + "/" + type + "/"+kind,
        success: function (data) {
            if (type == "UP") {
                $(obj).hasClass('text-danger') ? $(obj).removeClass('text-danger') : $(obj).addClass('text-danger');
                $(obj).parent().parent().find('.icon-down').removeClass('text-primary')
            } else {
                $(obj).hasClass('text-primary') ? $(obj).removeClass('text-primary') : $(obj).addClass('text-primary');
                $(obj).parent().parent().find('.icon-up').removeClass('text-danger')
            }
        }, error: function (error) {
            console.log(error);
        }
    })
};


function onCommentVote(obj, id, typ1, typ2) {
    //todo 권한 
    $.ajax({
        type: 'PUT',
        url: '/replyvoting/' + id + "/" + typ1 + "/" + typ2,
        success: function (data) {


            if (typ1 == "UP") {
                if ($(obj).hasClass('upvoted')) {
                    $(obj).removeClass('upvoted');
                    $(obj).parents("._grpvote").find("._upcnt").removeClass('upvoted');
                } else {
                    $(obj).addClass('upvoted');
                    $(obj).parents("._grpvote").find("._upcnt").addClass('upvoted');
                }
            

                $(obj).parents("._grpvote").find("._downcnt").removeClass('downvoted');
                $(obj).parents("._grpvote").find(".icon-down").removeClass('downvoted');

            } else {
                if ($(obj).hasClass('downvoted')) {
                    $(obj).removeClass('downvoted');
                    $(obj).parents("._grpvote").find("._downcnt").removeClass('upvoted');
                } else {
                    $(obj).addClass('downvoted');
                    $(obj).parents("._grpvote").find("._downcnt").addClass('downvoted');
                }
                $(obj).parents("._grpvote").find("._upcnt").removeClass('upvoted');
                $(obj).parents("._grpvote").find(".icon-up").removeClass('upvoted');
            }



            console.log(JSON.stringify(data));
            $(obj).parents("._grpvote").find("._upcnt").html(data.data[0].votingUp);
            $(obj).parents("._grpvote").find("._downcnt").html(data.data[0].votingDown);
        }, error: function (error) {
            console.log(error);
        }
    })
};