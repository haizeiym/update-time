let timeId = 0;
export default class TimeU {
    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    static addTime(duration, loopcall, loopcount = Number.MAX_VALUE, endcall) {
        const id = timeId++;
        this._timeList.push({
            id,
            duration,
            curtime: Date.now(),
            loopcall,
            loopcount,
            loopcountcur: 0,
            endcall
        });
        return id;
    }
    /**
     * 移除指定ID的计时器
     */
    static removeTime(id) {
        const index = this._timeList.findIndex((item) => item.id === id);
        if (index !== -1) {
            this._timeList.splice(index, 1);
        }
    }
    /**
     * 获取对象的唯一标识
     */
    static getObjectId(obj) {
        // 支持 Cocos Creator 2.4 和 3.x
        return obj.uuid || obj._id || '';
    }
    /**
     * 为对象添加计时器
     */
    static addObjTime(obj, duration, callback, loopcount = Number.MAX_VALUE, endcall) {
        var _a;
        const key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return -1;
        }
        // 创建或获取对象的计时器集合
        if (!this._objTimeMap.has(key)) {
            this._objTimeMap.set(key, new Set());
        }
        // 添加计时器
        const id = this.addTime(duration, callback, loopcount, () => {
            var _a;
            // 计时器结束时从集合中移除
            (_a = this._objTimeMap.get(key)) === null || _a === void 0 ? void 0 : _a.delete(id);
            endcall === null || endcall === void 0 ? void 0 : endcall();
        });
        // 记录计时器ID
        (_a = this._objTimeMap.get(key)) === null || _a === void 0 ? void 0 : _a.add(id);
        return id;
    }
    /**
     * 移除对象的所有计时器
     */
    static removeObjTime(obj) {
        const key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return;
        }
        const timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            // 移除所有计时器
            timerSet.forEach((id) => this.removeTime(id));
            this._objTimeMap.delete(key);
        }
    }
    /**
     * 移除对象的指定计时器
     */
    static removeObjTimeById(obj, id) {
        const key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return;
        }
        const timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            timerSet.delete(id);
            this.removeTime(id);
        }
    }
    /**
     * 清除所有计时器
     */
    static clear() {
        this._timeList = [];
        this._objTimeMap.clear();
        timeId = 0;
    }
    /**
     * 更新所有计时器
     */
    static update() {
        var _a;
        const now = Date.now();
        for (let i = this._timeList.length - 1; i >= 0; i--) {
            const item = this._timeList[i];
            if (now - item.curtime >= item.duration) {
                item.loopcall();
                item.loopcountcur++;
                if (item.loopcount > item.loopcountcur) {
                    item.curtime = now;
                }
                else {
                    (_a = item.endcall) === null || _a === void 0 ? void 0 : _a.call(item);
                    this._timeList.splice(i, 1);
                }
            }
        }
    }
}
TimeU._timeList = [];
TimeU._objTimeMap = new Map();
