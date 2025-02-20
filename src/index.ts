interface TimerItem {
    id: number;
    duration: number;
    curtime: number;
    loopcount: number;
    loopcountcur: number;
    loopcall: () => void;
    endcall?: () => void;
}

let timeId: number = 0;

export default class TimeU {
    private static _timeList: TimerItem[] = [];
    private static _objTimeMap: Map<string, Set<number>> = new Map();

    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    public static addTime(duration: number, loopcall: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
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
     * 添加一个一次性计时器
     */
    public static addTimeOnce(duration: number, callback: () => void) {
        this.addTime(duration, callback, 1);
    }

    /**
     * 移除指定ID的计时器
     */
    public static removeTime(id: number) {
        const index = this._timeList.findIndex((item) => item.id === id);
        if (index !== -1) {
            this._timeList.splice(index, 1);
        }
    }

    /**
     * 获取对象的唯一标识
     */
    private static getObjectId(obj: any): string {
        // 支持 Cocos Creator 2.4 和 3.x
        return obj.uuid || obj._id || '';
    }

    /**
     * 为对象添加计时器
     */
    public static addObjTime(obj: any, duration: number, callback: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
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
            // 计时器结束时从集合中移除
            this._objTimeMap.get(key)?.delete(id);
            endcall?.();
        });

        // 记录计时器ID
        this._objTimeMap.get(key)?.add(id);

        return id;
    }

    /**
     * 为对象添加一次性计时器
     */
    public static addObjTimeOnce(obj: any, duration: number, callback: () => void) {
        this.addObjTime(obj, duration, callback, 1);
    }

    /**
     * 移除对象的所有计时器
     */
    public static removeObjTime(obj: any) {
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
    public static removeObjTimeById(obj: any, id: number) {
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
    public static clear() {
        this._timeList = [];
        this._objTimeMap.clear();
        timeId = 0;
    }

    /**
     * 更新所有计时器
     */
    public static update() {
        const now = Date.now();
        for (let i = this._timeList.length - 1; i >= 0; i--) {
            const item = this._timeList[i];
            if (now - item.curtime >= item.duration) {
                item.loopcall();
                item.loopcountcur++;

                if (item.loopcount > item.loopcountcur) {
                    item.curtime = now;
                } else {
                    item.endcall?.();
                    this._timeList.splice(i, 1);
                }
            }
        }
    }
}
