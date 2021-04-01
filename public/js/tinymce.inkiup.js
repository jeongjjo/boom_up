var _editorID = null;
function getEditorContent() {
    return _editorID ? tinyMCE.get(_editorID).getBody().innerHTML : '';
}

function getEditorContentQS(qs) {
    return _editorID && qs ? tinyMCE.get(_editorID).getBody().querySelectorAll(qs) : null;
}

function _moveEditorContentCurrentPos() {
    var editor = tinyMCE.get(_editorID);
    var div = editor.selection.getNode()
    div.scrollIntoViewIfNeeded && div.scrollIntoViewIfNeeded();
    editor.selection.select(div);
    editor.selection.collapse(false);
}

function _addEditorContent(html) {
    if (tinyMCE.activeEditor) tinyMCE.activeEditor.dom.add(tinymce.activeEditor.getBody(), 'p', null, html);
}

function _addEditorContentCurrentPos(id, html) {
    if (_editorID) {
        tinyMCE.get(_editorID).execCommand('mceInsertContent', false, `<p id="${id}"><span style="border:1px solid #ccc"></span></p>`);
        setTimeout(function () {
            tinyMCE.activeEditor.dom.$('p#' + id).empty().html(html);
        }, 50);
    }
}

function _removeEditorContent(path) {
    if (_editorID) {
        var tmp = tinyMCE.get(_editorID).contentDocument.querySelector(path);
        tmp && tmp.remove();
    }
}

async function initEditor(targetId, options) {
    _editorID = await tinymce.init(Object.assign({
        selector: targetId,

        selector: 'textarea#article-editor',
        height: '100%',
        width: '100%',
        plugins: [
            'media powerpaste mediaembed',
            'pageembed'
        ],
        menubar: false,
        statusbar: false,
        contextmenu: false,
        toolbar_drawer: 'sliding',
        toolbar: 'iiimg media | bold | alignleft aligncenter alignright | forecolor | formatselect | italic underline strikethrough',
        mediaembed_max_width: 470,
        // mediaembed_content_css: '<%=serviceinfo.defaultUrl%>/css/write.css',
        // content_css: '<%=serviceinfo.defaultUrl%>/css/write.css',
        content_css_cors: true,
        extended_valid_elements: 'iframe[src|style|class],video[src|poster|playsinline|controls|loop|class|preload|width|height|data-setup],source[src|type],img[src|title|onerror],a[href|class|style]',
        media_filter_html: false,
        // // paste_as_text: true, // paste_preprocess에서 text 처리를 하려면 필요
        // paste_data_images: true, // keyboard의 paste로 이미지 자체를 붙여넣으려면 필요
        powerpaste_allow_local_images: true,
        powerpaste_word_import: 'prompt',
        powerpaste_html_import: 'clean',
        powerpaste_clean_filtered_inline_elements: "strong, em, b, i, u, strike, sup, sub",
        smart_paste: false,
        force_br_newlines: true,
        force_p_newlines: false,
        media_dimensions: false,
        block_formats: '보통=p; 작게=h4; 크게=h2; 가장크게=h1',
        // forced_root_block: '',
        // paste_preprocess: function (plugin, args) {
        // https://www.tiny.cloud/docs/plugins/paste/
        //     console.log(args.content);
        //     var targetUrl = args.target.dom.decode(args.content);
        //     if (isURL(targetUrl)) {
        //         var tid = 'CNP' + Date.now();
        //         // args.content = `<a data-paste-id="${tid}" href="${args.content}" target="_blank">${args.content}</a>`;
        //         if ((/\.(jpg|jpeg|png|gif|webp)$/ig).test(targetUrl)) {
        //             args.content = `<div data-paste-parent-id="${tid}" data-value="${args.content}" class="imgLink_box linkLoading"><img src="/img/ajax-loader.gif"/></div><br/>`;
        //             setTimeout(insertImageLink, 10, tid, targetUrl);
        //         } else if ((/youtube\.com|youtu\.be|vimeo\.com/i).test(targetUrl)) {
        //             args.content = `<div data-paste-parent-id="${tid}" data-value="${args.content}" class="videoLink_box linkLoading"><img src="/img/ajax-loader.gif"/></div><br/>`;
        //             setTimeout(fetchOpenGraphVideo, 100, tid, targetUrl);
        //         } else {
        //             args.content = `<div data-paste-parent-id="${tid}" data-value="${args.content}" class="openGraph_box linkLoading"><img src="/img/ajax-loader.gif"/></div><br/>`;
        //             setTimeout(fetchOpenGraph, 100, tid, targetUrl);
        //         }
        //     }
        // }
        paste_postprocess: function (pluginApi, data) {
            console.log(data.node, data.mode, data.source);
            if (data.source === 'image' && data.node.firstElementChild && data.node.firstElementChild.src && data.node.firstElementChild.src.startsWith('blob:')) {
                tinyMCE.activeEditor.uploadImages(function (success) {
                });
            } else if (((data.mode === 'auto' && data.source === 'plaintext') || (data.node.nodeName === "DIV" && data.node.getAttribute('data-mce-style') === "display:none")) && $(data.node).find('a').length > 0) {
                for (var a of $(data.node).find('a')) { var b = $(a.parentElement); b.text(a.href.trim()).removeAttr('data-mce-style').removeAttr('style'); console.log(a.parentElement); }
            }
        },
        images_upload_url: '/api/attach/blob?blob=true'
    }, options || {}));
    _editorID = _editorID && _editorID.length > 0 ? _editorID[0].id : null;
    const URL_PATTRN = new RegExp(/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+,.~#?&//=]*)$/);
    function isURL(str) { return (str.length < 2048 && URL_PATTRN.test(str)); }
}