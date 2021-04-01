var db = require("./mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;

module.exports = {
    calPoint: async function (contentid) {
        //Ranking -----------------
        /*
            (업-다운)*1.2 + (업+다운)*0.37 
            + (업댓-다운댓)*0.1  + (업댓+다운댓)*0.095  
            +  ( -, d 펌핑) 
            + (무플 패널티)   > 댓글 총 갯수가 (업+다운)의 10% 미만일 때, 업, 다운 총 합의 15%를 차감 / if(총 댓글<(업+다운)*0.1,(업+다운)*-0.15,0)
            +  (에이징)  +  업보트율 
        */
       if (contentid===null || contentid=='' || contentid==undefined) return;

       var point=0;
       var board = await db.getList("board", {_id:ObjectId(contentid)});
       if (board.length==0) return;
       var voteDownCount=(board[0].votingDown||0);
       var voteUpCount=(board[0].votingUp||0);
       var readCount=(board[0].readCount||0);
       var voteScore=voteUpCount-voteDownCount;
       var voteSum=voteUpCount+voteDownCount;

       //카테고리 불꽃모양
       var blnUpdate=false;
       var up
       if(voteSum>100){
            var lineup = await db.getList("lineup", {lineupKey:board[0].lineupKey} );
            if(lineup[0].fire){
                if(voteSum==lineup[0].voteSum){
                    var a = moment();
                    var b = moment(lineup[0].updateTS);
                    if((a.diff(b)/60000).toFixed()*1>60){
                        //up = await db.update("lineup", {lineupKey:board[0].lineupKey},{$set:{"fire":false,"voteSum":voteSum}} ) ;
                    }
                }else{
                    blnUpdate=true;
                }
            }else{
                blnUpdate=true;
            }
        }

        if(blnUpdate){
            //up = await db.update("lineup", {lineupKey:board[0].lineupKey},{$set:{"fire":true,"voteSum":voteSum}} ) ;
        }
        //202007월 배포버전부터는 카테고리 없어짐 따라서 주석처리함

        //20200410 랭킹률 변경 요청사항반영
       point= +((voteScore+(readCount)*0.012)+(voteSum*0.005)).toFixed(3);
/*
       point = (voteUpCount-voteDownCount)*1.2 + (voteUpCount+voteDownCount)*0.37
       
       var vote = await db.getList("vote", {"targetId":contentid});
       var voteUpUserList = vote.map(v =>  { 
           if(v.type=="UP"){ return v.userId } 
       });
       var voteDownUserList = vote.map(v =>  { 
           if(v.type=="DOWN"){ return v.userId } 
       });
       var voteupCommect = await db.getList("comment", { "userId": { $in: voteUpUserList },"contentId":contentid, delete:false }  );
       var votedownCommect = await db.getList("comment", { "userId": { $in: voteDownUserList },"contentId":contentid, delete:false }  );
       //업댓, 다운댓 계산
       point = point+(voteupCommect.length-votedownCommect.length)*0.1 + (voteupCommect.length+votedownCommect.length)*0.095
       //펌핑
       var downP=voteDownCount/voteSum*100
       var upP=voteUpCount/voteSum*100
       if (downP>50 && downP<60){
           point = point-((voteUpCount-voteDownCount)*0.9)
       } else if (downP>=60 && downP<70){
           point = point-((voteUpCount-voteDownCount)*1)
       } else if (downP>=70 && downP<80){
           point = point-((voteUpCount-voteDownCount)*1.1)
       } else if (downP>=80 && downP<90){
           point = point-((voteUpCount-voteDownCount)*1.3)
       } else if (downP>=90 && downP<100){
           point = point-((voteUpCount-voteDownCount)*1.5)
       }
       //무플패널티
       if( (voteupCommect.length+votedownCommect.length) < (voteSum * 0.1)) {
           point=point - (voteSum * 0.15);
       }
       //업보율
       point=+((point + upP).toFixed(3));

       //에이징처리안함 실시간으로 글이 올라올땨마다 모든글의 계산을 다시해야함 고민중

       //Ranking -----------------
*/

       var board = await db.update("board", {_id:ObjectId(contentid)},{$set:{"point":point}} , {upsert:true}   );
    },
    PowerLevel: async function (kind,type,cancel,writeUserId,targetid) {
        //kind > board, comment 
        //type > UP, DOWN 
        //cancel > 취소여부 true,false 
        //투표 게시글 > 업 2, 다운 -2 
        //투표 코멘트 > 업 1, 다운 -1 
        //하루에 한번 처리되도록 하루에 첫보팅일때
        var power=(kind=="board")?2:1;
        var updatetData = {};

        if(type=="DOWN"){
            power=-power
        }
        if(cancel){
            power=-power
        }
        updatetData.power=power
        var result = await db.updateById("user", writeUserId, { $inc: updatetData });

        /* 레벨
            1 20%
            2 25%
            3 20%
            4 15%
            5 10%
            6 7%
            7 3%
            8 10명
        */

        var schedule = await db.get("schedule", { code:'level' });
        var currDate=moment().format("YYYYMMDD");
        console.log(schedule.value,moment().format("YYYYMMDD"))

        //하루에 한번 첫 보팅이 일어나는 시점에 전체 사용자 레벨 업데이트 함
        if(schedule.value!=currDate){
            var user = await db.getList("user", {},0,0,{power:-1,countPost:-1,countVote:-1} );
            var total=user.length;
            var lv2=Math.round(total*0.8);
            var lv3=Math.round(total*0.55);
            var lv4=Math.round(total*0.35);
            var lv5=Math.round(total*0.2);
            var lv6=Math.round(total*0.1);
            var lv7=Math.round(total*0.03);
            var lv8=10;

            //console.log("total:",total)
            //console.log(lv2,lv3,lv4,lv5,lv6,lv7,lv8);
            //console.log(user[0].nickname)

            for (var i=0; i<user.length;i++){
                if(i<lv8){
                    await db.updateById("user", user[i]._id, {$set:{level:8}} );
                    //console.log("level 8", user[i].nickname)
                }else if(i<lv8+lv7){
                    await db.updateById("user", user[i]._id, {$set:{level:7}} );
                    //console.log("level 7", user[i].nickname)
                }else if(i<lv8+lv6){    
                    await db.updateById("user", user[i]._id, {$set:{level:6}} );
                    //console.log("level 6", user[i].nickname)
                }else if(i<lv8+lv5){
                    await db.updateById("user", user[i]._id, {$set:{level:5}} );
                    //console.log("level 5", user[i].nickname)
                }else if(i<lv8+lv4){
                    await db.updateById("user", user[i]._id, {$set:{level:4}} );
                    //console.log("level 4", user[i].nickname)
                }else if(i< lv8+lv3){
                    await db.updateById("user", user[i]._id, {$set:{level:3}} );
                    //console.log("level 3", user[i].nickname)
                }else if(i< lv8+lv2){
                    await db.updateById("user", user[i]._id, {$set:{level:2}} );
                    //console.log("level 2", user[i].nickname)
                }else{
                    await db.updateById("user", user[i]._id, {$set:{level:1}} );
                    //console.log("level 2", user[i].nickname)
                }
            }

            await db.update("schedule", { code:'level' },{$set:{value:currDate}} );
        }
        
    },
    PowerCal: async function (kind,targetid,userId) {
        var point = (kind=="board")?2:1;
        var voteUpList = await db.getList("vote", {"targetId":targetid,type:'UP'},0,0,{} );
        var voteDownList = await db.getList("vote", {"targetId":targetid,type:'DOWN'},0,0,{} );
        var power = (-point*voteUpList.length)+(point*voteDownList.length)
        var result = await db.updateById("user", userId, { $inc: {"power":power} });
    }

};
