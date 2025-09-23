interface TimerItem {
    id: number;
    duration: number;
    curtime: number;
    loopcount: number;
    loopcountcur: number;
    loopcall: () => void;
    endcall?: () => void;
    next?: TimerItem;
}

let timeId: number = 0;

export default class UTime {
    private static _timeList: TimerItem | undefined = undefined;
    private static _objTimeMap: Map<object, Set<number>> = new Map();
    // private static _hasActiveTimers: boolean = false;
    private static _isUpdating: boolean = false;
    private static _pendingTimers: TimerItem[] = [];

    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    public static addTime(duration: number, loopcall: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
        const id = ++timeId;
        const now = Date.now();
        
        const newTimer: TimerItem = {
            id,
            duration,
            curtime: now,
            loopcall,
            loopcount,
            loopcountcur: 0,
            endcall,
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
        
        // this._hasActiveTimers = true;
        return id;
    }

    /**
     * 添加一个一次性计时器
     */
    public static addTimeOnce(duration: number, callback: () => void): number {
        return this.addTime(duration, callback, 1);
    }

    /**
     * 移除指定ID的计时器
     */
    public static removeTime(id: number) {
        // 首先检查待处理队列
        const pendingIndex = this._pendingTimers.findIndex(timer => timer.id === id);
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
                this._cleanupTimer(current);
                // this._hasActiveTimers = !!this._timeList;
                return;
            }
            prev = current;
            current = current.next;
        }
    }

    /**
     * 为对象添加计时器
     */
    public static addObjTime(obj: any, duration: number, callback: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTime: Object parameter is null or undefined");
            } else {
                console.error(`addObjTime: Object parameter must be an object, got ${typeof obj}`);
            }
            return -1;
        }

        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }

        // 创建对象清理函数
        const objCleanup = () => {
            const timerSet = this._objTimeMap.get(obj);
            if (timerSet) {
                timerSet.delete(id);
                if (timerSet.size === 0) {
                    this._objTimeMap.delete(obj);
                }
            }
        };

        const id = this.addTime(duration, callback, loopcount, () => {
            objCleanup();
            endcall?.();
        });
        
        // 为对象定时器添加特殊的清理标记
        if (this._isUpdating) {
            // 如果是待处理队列中的定时器，直接标记
            const pendingTimer = this._pendingTimers[this._pendingTimers.length - 1];
            if (pendingTimer && pendingTimer.id === id) {
                (pendingTimer as any).__objCleanup = objCleanup;
            }
        } else {
            // 如果是主链表中的定时器，标记
            const timer = this._timeList;
            if (timer && timer.id === id) {
                (timer as any).__objCleanup = objCleanup;
            }
        }

        this._objTimeMap.get(obj)?.add(id);

        return id;
    }

    /**
     * 为对象添加一次性计时器
     */
    public static addObjTimeOnce(obj: any, duration: number, callback: () => void): number {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTimeOnce: Object parameter is null or undefined");
            } else {
                console.error(`addObjTimeOnce: Object parameter must be an object, got ${typeof obj}`);
            }
            return -1;
        }
        return this.addObjTime(obj, duration, callback, 0);
    }

    /**
     * 移除对象的所有计时器
     */
    public static removeObjTime(obj: any) {
        if (!obj || typeof obj !== 'object') {
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
        if (!obj || typeof obj !== 'object' || id === -1) {
            if (!obj) {
                console.error("removeObjTimeById: Object parameter is null or undefined");
            } else if (typeof obj !== 'object') {
                console.error(`removeObjTimeById: Object parameter must be an object, got ${typeof obj}`);
            }
            return -1;
        }

        const timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
            this.removeTime(id);
        }
        return -1;
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
        this._pendingTimers.forEach(timer => this._cleanupTimer(timer));
        
        this._timeList = undefined;
        this._objTimeMap.clear();
        // this._hasActiveTimers = false;
        this._isUpdating = false;
        this._pendingTimers.length = 0;
        timeId = 0;
    }

    /**
     * 清理无效的对象引用（可选的手动清理）
     */
    public static cleanup() {
        // 清理可能已经被垃圾回收的对象
        this._objTimeMap.forEach((timerSet, obj) => {
            if (!obj || timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
        });
        
        // 清理主链表中的无效定时器
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;
        
        while (current) {
            if (current.id === -1 || current.duration === 0) {
                if (prev) {
                    prev.next = current.next;
                } else {
                    this._timeList = current.next;
                }
                const next = current.next;
                this._cleanupTimer(current);
                current = next;
            } else {
                prev = current;
                current = current.next;
            }
        }
        
        // 清理待处理队列中的无效定时器
        this._pendingTimers = this._pendingTimers.filter(timer => {
            if (timer.id === -1 || timer.duration === 0) {
                this._cleanupTimer(timer);
                return false;
            }
            return true;
        });
        
        // this._hasActiveTimers = this._timeList !== undefined;
    }

    /**
     * 清理定时器对象的通用方法
     */
    private static _cleanupTimer(timer: TimerItem) {
        // 只执行对象清理，不执行用户的 endcall
        if ((timer as any).__objCleanup) {
            (timer as any).__objCleanup();
            (timer as any).__objCleanup = undefined;
        }
        
        // 清理回调函数引用，帮助垃圾回收
        timer.loopcall = () => {};
        timer.endcall = undefined;
        timer.next = undefined;
        
        // 清理其他属性，确保完全失效
        timer.id = -1;
        timer.duration = 0;
        timer.curtime = 0;
        timer.loopcount = 0;
        timer.loopcountcur = 0;
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
            objectTimers: this._objTimeMap.size,
            isUpdating: this._isUpdating,
            // hasActiveTimers: this._hasActiveTimers
        };
    }

    /**
     * 更新所有计时器
     */
    public static update() {
        if (!this._timeList) return;
        this._isUpdating = true;
        const now = Date.now();
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (current.duration === 0 || (current.duration > 0 && now - current.curtime >= current.duration)) {
                const nextNode: TimerItem | undefined = current.next;
                
                current.loopcall();
                current.loopcountcur++;

                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = nextNode;
                } else {
                    current.endcall?.();
                    if (prev) {
                        prev.next = nextNode;
                    } else {
                        this._timeList = nextNode;
                    }
                    current = nextNode;
                }
            } else {
                prev = current;
                current = current.next;
            }
        }

        this._isUpdating = false;

        if (this._pendingTimers.length > 0) {
            for (const timer of this._pendingTimers) {
                timer.next = this._timeList || undefined;
                this._timeList = timer;
            }
            this._pendingTimers.length = 0;
        }

        // this._hasActiveTimers = this._timeList !== undefined;
    }
}
