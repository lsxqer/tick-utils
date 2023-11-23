let _startTime = null;
export function markStartTime() {
    _startTime = Date.now();
}
export function shouldYieldWithStart() {
    let end = Date.now();
    let step = end - _startTime;
    if (step > 80) {
        _startTime = end;
        return true;
    }
    return false;
}
