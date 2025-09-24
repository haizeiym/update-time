type TimerCall = () => void | undefined;

interface TimerItem {
    id: number;
    duration: number;
    curtime: number;
    loopcount: number;
    loopcountcur: number;
    loopcall: TimerCall;
    endcall?: TimerCall;
    objcleanup?: TimerCall;
    next?: TimerItem;
}

const NONE: number = -1;
const INFINITY: number = Number.MAX_VALUE;

let timeId: number = 0;
export default class UTime {
    private static _timeList: TimerItem | undefined = undefined;
    private static _objTimeMap: Map<object, Set<number>> = new Map();
    private static _isUpdating: boolean = false;
    private static _pendingTimers: TimerItem[] = [];
    private static _pendingCleanupTimers: TimerItem[] = [];

    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    public static addTime(
        duration: number,
        loopcall: TimerCall,
        loopcount: number = INFINITY,
        endcall?: TimerCall,
        objcleanup?: TimerCall
    ): number {
        const id = ++timeId;
        const now = Date.now();

        const newTimer: TimerItem = {
            id,
            duration,
            curtime: now,
            loopcount,
            loopcountcur: 0,
            loopcall,
            endcall,
            objcleanup,
            next: undefined
        };
        // 如果正在更新中，将计时器加入待处理队列
        if (this._isUpdating) {
            this._pendingTimers.push(newTimer);
        } else {
            // 直接添加到链表头部
            newTimer.next = this._timeList || undefined;
            this._timeList = newTimer;
        }

        return id;
    }

    /**
     * 添加一个一次性计时器
     */
    public static addTimeOnce(duration: number, callback: TimerCall): number {
        return this.addTime(duration, callback, 1);
    }

    /**
     * 移除指定ID的计时器
     */
    public static removeTime(id: number) {
        // 首先检查待处理队列
        const pendingIndex = this._pendingTimers.findIndex((timer) => timer.id === id);
        if (pendingIndex !== -1) {
            const timer = this._pendingTimers[pendingIndex];
            this._cleanupTimer(timer);
            this._pendingTimers.splice(pendingIndex, 1);
            return;
        }

        // 然后检查主链表
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (current.id === id) {
                if (prev) {
                    prev.next = current.next;
                } else {
                    this._timeList = current.next;
                }
                this._pendingCleanupTimers.push(current);
                return;
            }
            prev = current;
            current = current.next;
        }
    }

    /**
     * 为对象添加计时器
     */
    public static addObjTime(
        obj: any,
        duration: number,
        callback: TimerCall,
        loopcount: number = INFINITY,
        endcall?: TimerCall
    ): number {
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("addObjTime: Object parameter is null or undefined");
            } else {
                console.error(`addObjTime: Object parameter must be an object, got ${typeof obj}`);
            }
            return NONE;
        }

        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }

        const id = this.addTime(
            duration,
            callback,
            loopcount,
            typeof endcall === "function" ? endcall : undefined,
            () => {
                const timerSet = this._objTimeMap.get(obj);
                if (timerSet) {
                    timerSet.delete(id);
                    if (timerSet.size === 0) {
                        this._objTimeMap.delete(obj);
                    }
                }
            }
        );

        this._objTimeMap.get(obj)?.add(id);

        return id;
    }

    /**
     * 为对象添加一次性计时器
     */
    public static addObjTimeOnce(obj: any, duration: number, callback: TimerCall): number {
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("addObjTimeOnce: Object parameter is null or undefined");
            } else {
                console.error(`addObjTimeOnce: Object parameter must be an object, got ${typeof obj}`);
            }
            return NONE;
        }
        return this.addObjTime(obj, duration, callback, 1);
    }

    /**
     * 移除对象的所有计时器
     */
    public static removeObjTime(obj: any) {
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("removeObjTime: Object parameter is null or undefined");
            } else {
                console.error(`removeObjTime: Object parameter must be an object, got ${typeof obj}`);
            }
            return;
        }

        const timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.forEach((id) => this.removeTime(id));
            this._objTimeMap.delete(obj);
        }
    }

    /**
     * 移除对象的指定计时器
     */
    public static removeObjTimeById(obj: any, id: number): number {
        if (!obj || typeof obj !== "object" || id === NONE) {
            if (!obj) {
                console.error("removeObjTimeById: Object parameter is null or undefined");
            } else if (typeof obj !== "object") {
                console.error(`removeObjTimeById: Object parameter must be an object, got ${typeof obj}`);
            }
            return NONE;
        }
        this.removeTime(id);
        return NONE;
    }

    /**
     * 清除所有计时器
     */
    public static clear() {
        // 清理所有计时器的回调函数引用
        let current: TimerItem | undefined = this._timeList;
        while (current) {
            const next = current.next;
            this._cleanupTimer(current);
            current = next;
        }

        // 清理待处理队列中的计时器
        this._pendingTimers.forEach((timer) => this._cleanupTimer(timer));

        // 清理待清理队列中的计时器
        this._pendingCleanupTimers.forEach((timer) => this._cleanupTimer(timer));

        this._timeList = undefined;
        this._objTimeMap.clear();
        this._isUpdating = false;
        this._pendingTimers.length = 0;
        this._pendingCleanupTimers.length = 0;
        timeId = 0;
    }

    /**
     * 清理定时器对象的通用方法
     */
    private static _cleanupTimer(timer: TimerItem) {
        if (timer.id === NONE) return;

        if (timer.objcleanup) {
            timer.objcleanup();
            timer.objcleanup = undefined;
        }

        timer.id = NONE;
        timer.duration = 0;
        timer.curtime = 0;
        timer.loopcount = 0;
        timer.loopcountcur = 0;
        timer.loopcall = () => void 0;
        timer.endcall = undefined;
    }

    /**
     * 获取统计信息
     */
    public static getStats() {
        let activeTimerCount = 0;
        let current = this._timeList;
        while (current) {
            activeTimerCount++;
            current = current.next;
        }
        return {
            activeTimers: activeTimerCount,
            pendingTimers: this._pendingTimers.length,
            objectTimers: this._objTimeMap.size
        };
    }

    /**
     * 更新所有计时器
     */
    public static update() {
        if (this._timeList?.id === NONE) {
            this._timeList = this._timeList?.next;
        }
        if (!this._timeList) return;

        this._isUpdating = true;
        const now = Date.now();
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (current.id === NONE) {
                prev = current;
                current = current.next;
                continue;
            }

            if (current.duration === 0 || (current.duration > 0 && now - current.curtime >= current.duration)) {
                const nextNode: TimerItem | undefined = current.next;
                current.loopcall();
                current.loopcountcur++;
                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = nextNode;
                } else {
                    if (current.objcleanup) {
                        current.objcleanup();
                        current.objcleanup = undefined;
                    }
                    current.endcall?.();
                    if (prev) {
                        prev.next = nextNode;
                    } else {
                        this._timeList = nextNode;
                    }
                    this._pendingCleanupTimers.push(current);
                    current = nextNode;
                }
            } else {
                prev = current;
                current = current.next;
            }
        }

        this._isUpdating = false;

        for (const timer of this._pendingCleanupTimers) {
            this._cleanupTimer(timer);
        }
        this._pendingCleanupTimers.length = 0;

        if (this._pendingTimers.length > 0) {
            for (const timer of this._pendingTimers) {
                timer.next = this._timeList || undefined;
                this._timeList = timer;
            }
            this._pendingTimers.length = 0;
        }
    }
}
