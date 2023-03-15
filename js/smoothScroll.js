(function (options = null) {
    let taskQueue = [];//初始化任务队列
    let pending = false;//等待队列执行完毕
    let sm_opt;
    let lastScroll = Date.now();
    if (options) sm_opt = options;
    else sm_opt = {
        frameRate: 150,              //fps
        animationDuration: 1000,    //ms
        pulseNormalize: 1,
        accelerationDelta: 50,//加速度判定范围
        accelerationMax: 3,//加速度最大等级
    };

    //处理动画队列
    const scrollHandler = function (top) {
        if (sm_opt.accelerationMax != 1) {
            let now = Date.now();
            let deltaTime = now - lastScroll;
            if (deltaTime < sm_opt.accelerationDelta) {//两次滚动的时间间隔在范围内
                let factor = (1 + (50 / deltaTime)) / 2;
                if (factor > 1) {//加速因子大于1,开始加速度
                    top *= Math.min(factor, sm_opt.accelerationMax);//最大加速度不超过3
                }
            }
            lastScroll = Date.now();
        }
        taskQueue.push({
            top: top,
            lastY: (top < 0) ? 0.99 : -0.99,           //保存上一次循环后的y值,给予一点点作用力
            time: Date.now()    //获取任务进入队列的时间
        });
        if (pending) return;
        const step = function () {
            let now = Date.now();
            let scrollY = 0;
            for (let i = 0; i < taskQueue.length; ++i) {
                let item = taskQueue[i];
                let deltaTime = (now - item.time);//已经执行了的时间
                let finished = deltaTime >= sm_opt.animationDuration;//当执行时间到达动画持续时间时，该任务结束
                //let position = pulse(finished ? 1 : (deltaTime / sm_opt.animationDuration));//将移动距离分解成[0,1]区间
                let position = finished ? 1 : (deltaTime / sm_opt.animationDuration);
                position = linearTransition(position);
                let x = (item.top * position - item.lastY) >> 0;
                scrollY += x;
                item.lastY += x;
                if (finished) {
                    taskQueue.splice(i, 1);
                    --i;
                }
            }

            if (window.scrollBy) window.scrollBy(0, scrollY);
            else document.documentElement.scrollTop += scrollY;

            if (taskQueue.length)
                requestFrame(step, (1000 / sm_opt.frameRate + 1));
            else
                pending = false;
        }

        requestFrame(step, 0);//立即异步执行动画队列
        pending = true;//新的队列正在执行,将阻塞下一次队列的创建
    }

    //处理滚动事件的函数
    const wheel = function (event) {
        let e = event || window.event;
        if (e.defaultPrevented || e.ctrlKey) return;
        let deltaY = e.deltaY < 0 ? -150 : 150;
        scrollHandler(deltaY);
        event.preventDefault();
    }

    const requestFrame = (function () {
        return (window.requestAnimationFrame || window.webkitRequestAnimatonFrame || window.mozRequestAnimationFrame || function (handler, delay) { window.setTimeout(handler, delay); });
    })();

    const computeLinear = function (x) {
        let ret, begin;
        x *= 5;
        if (x < 1) ret = x - (1 - Math.exp(-x));
        else {
            begin = Math.exp(-1);
            --x;
            scale = 1 - Math.exp(-x);
            ret = begin + (scale * (1 - begin));
        }
        return ret * sm_opt.pulseNormalize;
    }

    const linearTransition = function (time) {
        if (time >= 1) return 1;
        if (time <= 0) return 0;
        if (sm_opt.pulseNormalize == 1) sm_opt.pulseNormalize /= computeLinear(1);
        return computeLinear(time);
    }

    const addEvent = function (target, type, callback, param = {}) {
        if (target.addEventListener) target.addEventListener(type, callback, param);
        else target.attachEvent(type, callback, param);
    }

    const run = function () {
        addEvent(window, "wheel", wheel, { passive: false });
    }
    run();
})();