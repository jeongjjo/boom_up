(function( $ ){
    $.fn.naaEvent = function (opt = {}) {
        opt.maxHeight = opt.maxHeight || 80;
        opt.distIgnore = opt.distIgnore || 0;
        opt.id = opt.id || 'naa-scrooll';
        opt.maxWidth = opt.maxWidth || 100;

        opt.message = opt.message || {};
        opt.message.refresh = opt.message.refresh || {};
        opt.message.refresh.release = opt.message.refresh.release || 'Release to refresh';
        opt.message.refresh.pull = opt.message.refresh.pull || 'Pull down to refresh';
        opt.message.refresh.progress = opt.message.refresh.progress || 'Refreshing';

        var $el = $(this);
        var $reflash = null;

        let isPassive = () => {
            var supportsPassiveOption = false;
            try {
            addEventListener(
            "test",
            null,
            Object.defineProperty({}, "passive", {
                get: function() {
                supportsPassiveOption = true;
                }
            })
            );
        } catch (e) {}
        return supportsPassiveOption;
        }
        
        let screenY = (e) => {
            return e.touches && e.touches[0] ? e.touches[0].screenY : e.screenY;
        }

        let screenX = (e) => {
            return e.touches && e.touches[0] ? e.touches[0].screenX : e.screenX;
        }

        $el.reset = () => {
            if ($reflash.length > 0) {
                $reflash.css('min-height', '0px');
                $reflash.update("pending");
            }

            _dist = 0;
            _startY = 0;
            _stratX = 0;
            _moveY = 0;
            _moveX = 0;
        }

        if (opt.onPullToRefresh) {
            $(opt.main || $el).prepend("<div id='"+opt.id+"-reflash' class='naaevent'><div class='box'><div class='content'><div class='icon icon-arrow-up'></div><div class='text'>Pull to refresh</div></div></div></div>");
            
            $reflash = $("#"+opt.id+"-reflash");
            var $reflashText = $reflash.find(".text");

            var _dist = 0;
            var _startY = 0;
            var _startX = 0;
            var _moveY = 0;
            var _moveX = 0;
            var _status = "pending"; 
            
            $reflash.update = (s) => {
                switch(s) {
                    case 'pulling':
                        $reflashText.text(opt.message.refresh.pull);
                        $reflash.removeClass('release');
                        break;
                    case 'pending':
                        $reflashText.text(opt.message.refresh.pull);
                        $reflash.removeClass('release progress');
                        break;
                    case 'releasing':
                        $reflashText.text(opt.message.refresh.release);
                        $reflash.addClass('release');
                        break;
                    case 'refreshing':
                        $reflashText.text(opt.message.refresh.progress);
                        $reflash.addClass('progress');
                        $reflash.removeClass('release');
                        break;
                }
                _status = s;
            }

            let _touchstart = (e) => {
                _startX = _moveX = screenX(e);

                if ($reflash.length <= 0) {
                    return;
                }

                if($el.scrollTop() == 0) {
                    _startY = screenY(e);
                }
            }

            let _touchmove = (e) => {
                if (_startX > 0) {
                    _moveX = screenX(e);
                }

                if ($reflash.length <= 0) {
                    return;
                }

                if (_status === 'refreshing') {
                    e.preventDefault();
                    return;
                }

                if (!_startY) {
                    if ($el.scrollTop() == 0) {
                        _startY = screenY(e);
                    }
                } else {
                    _moveY = screenY(e);
                }

                if (_startY && _moveY) {
                    _dist = _moveY - _startY;
                }

                if (_status === 'pending') {
                    $reflash.update('pulling');
                }

                if (_dist > 0 && $el.scrollTop() == 0) {
                    e.preventDefault();
                    $reflash.css('min-height', Math.min(_dist, opt.maxHeight)+'px');
                    if (_status === 'pulling' && Math.abs(_dist) > opt.maxHeight) {
                        $reflash.update('releasing');
                        _startX = -1;
                    } else if (_status === 'releasing' && Math.abs(_dist) < opt.maxHeight) {
                        $reflash.update('pulling');
                        _startX = -1;
                    }
                }
            }

            var _timeout = null;
            let _touchend = (e) => {
                if (_startX > 0) {
                    //console.log(_startX, _moveX);
                    var d = _startX - _moveX;
                    
                    if (typeof opt.onSwipe === 'function' && Math.abs(d) > opt.maxWidth && _dist < opt.maxHeight) {
                        if (d > 0) {
                            opt.onSwipe('right');
                            $el.reset();
                        } else if (d < 0) {
                            opt.onSwipe('left');
                            $el.reset();
                        }
                    }
                }
                
                if ($reflash.length <= 0) {
                    return;
                }

                var cbReset = null;
                if (_status === 'releasing' && _dist > opt.maxHeight) {
                    if (_dist > 0 && $el.scrollTop() == 0) {
                        $reflash.update('refreshing');
                        if (typeof opt.onPullToRefresh === 'function') {
                            cbReset = opt.onPullToRefresh();
                        }
                    }
                }

                clearTimeout(_timeout);

                if (typeof cbReset === 'function') {
                } else {
                    _timeout = setTimeout(function () {
                        $el.reset();
                    }, 500);
                }
            }
            
            //안드로이드 이벤트 문제 수정 테스트 1단계
            window.addEventListener("touchstart", _touchstart);
            window.addEventListener("touchend", _touchend);
            window.addEventListener("touchmove", _touchmove, isPassive() ? { capture: false, passive: false } : false ); 
        }

        let _scrollChangeAnimation = () => {
            var $viewEl = $("[data-naa-animation-scroll]:not(.visible)").filter((i, s) => {
                var height = $(s).height();
                var docViewTop = $el.scrollTop();
                var docViewBottom = docViewTop + $el.outerHeight() + (height * 2);
                var elemTop = s.offsetTop;
                var elemBottom = elemTop + height;
                return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
            });
            
            $viewEl.addClass("visible");
            $.each($viewEl, (idx, item) => {
                $(item).addClass($(item).data('naa-animation-scroll'));
            });
        }

        var _scrollTimeout = null;
        $el.scroll(()=>{
            clearTimeout(_scrollTimeout);
            _scrollTimeout = setTimeout(() => {
                opt.onScrollEnd && opt.onScrollEnd();
            }, 200);
            let scrollMax = ($el.prop('scrollHeight') || document.documentElement.scrollHeight) - ($el.outerHeight() * 3);
            if ($el.scrollTop() >= scrollMax) {
                opt.onMore && opt.onMore(()=>{});
            }
            opt.onScroll && opt.onScroll();
            _scrollChangeAnimation();
        });
        // 변화 되는 상태를 체크 하기 위한 함수
        var _lastScrollHeight = 0;
        let _watch = () => {
            cancelAnimationFrame(_watcher);
            if (_lastScrollHeight != (opt.main ? $(opt.main).outerHeight() : ($el.prop('scrollHeight') || document.documentElement.scrollHeight))) {
                opt.onScrollHeightResize && opt.onScrollHeightResize();
                _scrollChangeAnimation();
                
                _lastScrollHeight = opt.main ? $(opt.main).outerHeight() : ($el.prop('scrollHeight') || document.documentElement.scrollHeight);
            }
            _watcher = requestAnimationFrame(_watch);
        };
        
        var _watcher = window.requestAnimationFrame(_watch);

        return $el;
    };
})( jQuery );