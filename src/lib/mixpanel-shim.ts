// Shim para Mixpanel cuando la librería no está instalada
const noop = (..._args: any[]) => { };

export interface Dict { [key: string]: any; }
export interface Query { [key: string]: any; }

const mixpanel = {
    init: noop,
    track: noop,
    identify: noop,
    reset: noop,
    time_event: noop,
    people: {
        set: noop,
        increment: noop,
        append: noop,
        union: noop,
        track_charge: noop,
        clear_charges: noop,
        delete_user: noop,
    },
};

export default mixpanel;
