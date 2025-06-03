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
     * 获取对象的唯一标识
     */
    UTime.getObjectId = function (obj) {
        // 支持 Cocos Creator 2.4 和 3.x
        return obj.uuid || obj._id || '';
    };
    /**
     * 为对象添加计时器
     */
    UTime.addObjTime = function (obj, duration, callback, loopcount, endcall) {
        var _this = this;
        var _a;
        if (loopcount === void 0) { loopcount = Number.MAX_VALUE; }
        var key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return -1;
        }
        // 创建或获取对象的计时器集合
        if (!this._objTimeMap.has(key)) {
            this._objTimeMap.set(key, new Set());
        }
        // 添加计时器
        var id = this.addTime(duration, callback, loopcount, function () {
            var _a;
            // 计时器结束时从集合中移除
            (_a = _this._objTimeMap.get(key)) === null || _a === void 0 ? void 0 : _a.delete(id);
            endcall === null || endcall === void 0 ? void 0 : endcall();
        });
        // 记录计时器ID
        (_a = this._objTimeMap.get(key)) === null || _a === void 0 ? void 0 : _a.add(id);
        return id;
    };
    /**
     * 为对象添加一次性计时器
     */
    UTime.addObjTimeOnce = function (obj, duration, callback) {
        return this.addObjTime(obj, duration, callback, 1);
    };
    /**
     * 移除对象的所有计时器
     */
    UTime.removeObjTime = function (obj) {
        var _this = this;
        var key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return;
        }
        var timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            // 移除所有计时器
            timerSet.forEach(function (id) { return _this.removeTime(id); });
            this._objTimeMap.delete(key);
        }
    };
    /**
     * 移除对象的指定计时器
     */
    UTime.removeObjTimeById = function (obj, id) {
        var key = this.getObjectId(obj);
        if (!key || id === -1) {
            console.error("Object has no uuid or _id");
            return -1;
        }
        var timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(key);
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
            if (now - current.curtime >= current.duration) {
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
