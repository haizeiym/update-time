var timeId = 0;
var UTime = /** @class */ (function () {
    function UTime() {
    }
    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    UTime.addTime = function (duration, loopcall, loopcount, endcall) {
        if (loopcount === void 0) { loopcount = Number.MAX_VALUE; }
        var id = ++timeId;
        var newTimer = {
            id: id,
            duration: duration,
            curtime: Date.now(),
            loopcall: loopcall,
            loopcount: loopcount,
            loopcountcur: 0,
            endcall: endcall,
            next: this._timeList || undefined
        };
        this._timeList = newTimer;
        this._hasActiveTimers = true;
        return id;
    };
    /**
     * 添加一个一次性计时器
     */
    UTime.addTimeOnce = function (duration, callback) {
        return this.addTime(duration, callback, 1);
    };
    /**
     * 移除指定ID的计时器
     */
    UTime.removeTime = function (id) {
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.id === id) {
                if (prev) {
                    prev.next = current.next;
                }
                else {
                    this._timeList = current.next;
                }
                this._hasActiveTimers = this._timeList !== undefined;
                return;
            }
            prev = current;
            current = current.next;
        }
    };
    /**
     * 为对象添加计时器
     */
    UTime.addObjTime = function (obj, duration, callback, loopcount, endcall) {
        var _this = this;
        var _a;
        if (loopcount === void 0) { loopcount = Number.MAX_VALUE; }
        if (!obj || typeof obj !== 'object') {
            console.error("Invalid object provided for timer");
            return -1;
        }
        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }
        var id = this.addTime(duration, callback, loopcount, function () {
            var timerSet = _this._objTimeMap.get(obj);
            if (timerSet) {
                timerSet.delete(id);
                if (timerSet.size === 0) {
                    _this._objTimeMap.delete(obj);
                }
            }
            endcall === null || endcall === void 0 ? void 0 : endcall();
        });
        (_a = this._objTimeMap.get(obj)) === null || _a === void 0 ? void 0 : _a.add(id);
        return id;
    };
    /**
     * 为对象添加一次性计时器
     */
    UTime.addObjTimeOnce = function (obj, duration, callback) {
        if (!obj || typeof obj !== 'object') {
            console.error("Invalid object provided for timer");
            return -1;
        }
        return this.addObjTime(obj, duration, callback, 1);
    };
    /**
     * 移除对象的所有计时器
     */
    UTime.removeObjTime = function (obj) {
        var _this = this;
        if (!obj || typeof obj !== 'object') {
            console.error("Invalid object provided for timer removal");
            return;
        }
        var timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.forEach(function (id) { return _this.removeTime(id); });
            this._objTimeMap.delete(obj);
        }
    };
    /**
     * 移除对象的指定计时器
     */
    UTime.removeObjTimeById = function (obj, id) {
        if (!obj || typeof obj !== 'object' || id === -1) {
            console.error("Invalid object or timer ID provided");
            return -1;
        }
        var timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
            this.removeTime(id);
        }
        return -1;
    };
    /**
     * 清除所有计时器
     */
    UTime.clear = function () {
        this._timeList = undefined;
        this._objTimeMap.clear();
        this._hasActiveTimers = false;
        timeId = 0;
    };
    /**
     * 更新所有计时器
     */
    UTime.update = function () {
        var _a;
        if (!this._hasActiveTimers)
            return;
        var now = Date.now();
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.duration <= 0 || now - current.curtime >= current.duration) {
                current.loopcall();
                current.loopcountcur++;
                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = current.next;
                }
                else {
                    (_a = current.endcall) === null || _a === void 0 ? void 0 : _a.call(current);
                    if (prev) {
                        prev.next = current.next;
                    }
                    else {
                        this._timeList = current.next;
                    }
                    current = current.next;
                }
            }
            else {
                prev = current;
                current = current.next;
            }
        }
        this._hasActiveTimers = this._timeList !== undefined;
    };
    UTime._timeList = undefined;
    UTime._objTimeMap = new Map();
    UTime._hasActiveTimers = false;
    return UTime;
}());
export default UTime;
