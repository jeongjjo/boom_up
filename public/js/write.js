var uploader = new plupload.Uploader({
    runtimes: 'html5,html4',
    browse_button: 'pickfiles',
    url: "/api/attach",
    resize: {
        width: 1280,
        height: 720,
        quality: 90
    },
    filters: {
        max_file_size: '10mb',
        mime_types: [
            { title: "file", extensions: "jpg,gif,png" }
        ]
    },
    init: {
        FilesAdded: function (up, files) {
            uploader.start();
            return false;
        },
        filters: {
            max_file_size: '10mb',
            mime_types: [
                { title: "file", extensions: "jpg,gif,png,jpeg" },
                { title: "Video Files", extensions: "avi,mp4" }
            ]
        },
        FileUploaded: function (up, file, response) {
            onResultData(JSON.parse(response.response).data);
        },
        Error: function (up, err) {
            console.log(err);
        }
    }
});
uploader.init();

$.validator.messages = {
    required: "<%= __('VALIDATOR_REQUIRED')%>",
    remote: "<%= __('VALIDATOR_REMOTE')%>",
    email: "<%= __('VALIDATOR_EMAIL')%>",
    url: "<%= __('VALIDATOR_URL')%>",
    date: "<%= __('VALIDATOR_DATE')%>",
    dateISO: "<%= __('VALIDATOR_DATEISO')%>",
    number: "<%= __('VALIDATOR_NUMBER')%>",
    digits: "<%= __('VALIDATOR_DIGITS')%>",
    equalTo: "<%= __('VALIDATOR_EQUALTO')%>",
    maxlength: $.validator.format("<%= __('VALIDATOR_MAXLENGTH')%>"),
    minlength: $.validator.format("<%= __('VALIDATOR_MINLENGTH')%>"),
    rangelength: $.validator.format("<%= __('VALIDATOR_RANGELENGTH')%>"),
    range: $.validator.format("<%= __('VALIDATOR_RANGE')%>"),
    max: $.validator.format("<%= __('VALIDATOR_MAXLENGTH')%>"),
    min: $.validator.format("<%= __('VALIDATOR_MINLENGTH')%>"),
    step: $.validator.format("<%= __('VALIDATOR_STEP')%>")
};

$.validator.addMethod("byteRangeLength", function (value, element, param) {
    var length = value.length;
    for (var i = 0; i < value.length; i++) { if (value.charCodeAt(i) > 127) { length++; } }
    return this.optional(element) || (length >= param[0] && length <= param[1]);
}, $.validator.format("<%= __('VALIDATOR_BYTELENGTH')%>")); 