var fs = require('fs');

var async = require('async');

var common = require('./common');

// https://medium.com/@manojsinghnegi/sending-an-email-using-nodemailer-gmail-7cfa0712a799 - 처음 설정 후 메일 보낼 때 오류 시
// https://nodemailer.com/about/
// for google : https://accounts.google.com/DisplayUnlockCaptcha
var nodemailer = require("nodemailer");

function sendEMail(mailinfo) {
    var smtpConfig = {
        // host: tempconfig.host,
        // port: tempconfig.port,
        // secure: tempconfig.secure || false,
        service: "Gmail",
        auth: {
            user: global.config.smtp.id,
            pass: global.config.smtp.pass
        }
    };

    var transport = nodemailer.createTransport(smtpConfig);

    var mailOptions = Object.assign({
        from: global.config.serviceinfo.mailSender.from,
        replyTo: global.config.serviceinfo.mailSender.replyto
    }, mailinfo);

    return new Promise((resolove, reject) => {
        transport.sendMail(mailOptions, function (error, response) {
            if (error) {
                console.log(error);
            } else {
                console.log("Message sent: " + response.message);
            }
            transport.close();
            resolove({err: error, response: response});
        });
    });
}

// https://community.nodemailer.com/using-gmail/
/*
      var transporter = nodemailer.createTransport({
        host: 'smtp.office365.com', // Office 365 server
        port: 587,     // secure SMTP
        secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
        auth: {
            user: username,
            pass: password
        },
        tls: {
            ciphers: 'SSLv3'
        }
        //requireTLS: true
    });
 */
function testSMTP(next) {

    var file = '../config_email.json';
    var tempconfig = null;

    try {
        var tmp = fs.readFileSync(file, {
            encoding: 'utf8'
        });

        if (tmp) {
            tempconfig = common.parseJSON(tmp, null);
        }

    } catch (e) {
        console.error(e);
    }

    var smtpConfig = {
        // host: tempconfig.host,
        // port: tempconfig.port,
        // secure: tempconfig.secure || false,
        service: "Gmail",
        auth: {
            user: tempconfig.id,
            pass: tempconfig.pass
        }
    };

    var transport = nodemailer.createTransport(smtpConfig);

    transport.verify(function (error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log("Message sent: " + response.message);
        }

        transport.close();

        next(error, response);
    });
}

module.exports = {
    sendEMail: sendEMail,
    testSMTP: testSMTP
};