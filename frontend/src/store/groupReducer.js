import { csrfFetch } from "./csrf"

// -ActionTypes-------------------------

const GET_GROUPS = 'groups/GET_GROUPS'

const GET_GROUP = 'groups/GET_GROUP'

const POST_GROUP = 'groups/POST_GROUP'

const PUT_GROUP = 'groups/PUT_GROUP'

const DELETE_GROUP = 'groups.DELETE_GROUP'

// -Actions-------------------------

export const loadGroups = (groups) => {
    return {
        type: GET_GROUPS,
        groups
    }
}

export const loadGroup = (group, events) => {
    return {
        type: GET_GROUP,
        group,
        events
    }
}

export const createGroup = (group, img, user, venue) => {
    return {
        type: POST_GROUP,
        group,
        img,
        user,
        venue
    }
}

export const updateGroup = (group, img, user, events, venues, images) => {
    return {
        type: PUT_GROUP,
        group,
        img,
        user,
        events,
        venues,
        images
    }
}

export const removeGroup = (id) => {
    return {
        type: DELETE_GROUP,
        id
    }
}

// -Thunks-------------------------

export const fetchGroups = () => async dispatch => {
    const res = await csrfFetch('/api/groups');

    if (res.ok) {
        const groups = await res.json();
        dispatch(loadGroups(groups))
    }
}

export const fetchGroup = (id) => async dispatch => {
    const groupRes = await csrfFetch(`/api/groups/${id}`);

    if (groupRes.ok) {
        const group = await groupRes.json();
        const eventsRes = await csrfFetch(`/api/groups/${id}/events`);

        if (eventsRes.ok) {
            const events = await eventsRes.json();
            //For of look up promise.all too

            if (events[0]) {
                let i = 0
                for (const event of Object.values(events)) {
                    const eventImgRes = await csrfFetch(`/api/events/${event.id}`)

                    if (eventImgRes.ok) {
                        const eventImg = await eventImgRes.json()
                        events[i].url = eventImg.EventImages[0].url
                        dispatch(loadGroup(group, events))
                    }
                    i++
                }
            } else {
                dispatch(loadGroup(group, events))
            }
        }
    }
}

export const postGroup = (groupInfo, user) => async (dispatch) => {
    const groupRes = await csrfFetch('/api/groups', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupInfo)
    })

    if (groupRes.ok) {
        const group = await groupRes.json()

        const venueRes = await csrfFetch(`/api/groups/${group.id}/venues`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                groupId: group.id,
                address: 'Online',
                city: 'Online',
                lat: 1,
                lng: 1,
                state: 'Online'
            })
        })

        if (venueRes.ok) {
            const venue = await venueRes.json()

            const imgRes = await csrfFetch(`/api/groups/${group.id}/images`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupInfo.imageInfo)
            })

            if (imgRes.ok) {
                const img = await imgRes.json()
                dispatch(createGroup(group, img, user, venue))

                return group
            }
        }
    }
}

export const putGroup = (groupInfo, user, events, venues, images) => async (dispatch) => {
    const groupRes = await csrfFetch(`/api/groups/${groupInfo.id}/edit`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupInfo)
    })

    if (groupRes.ok) {
        const group = await groupRes.json()

        let img = null;

        if (groupInfo.imageInfo.url) {
            const imgRes = await csrfFetch(`/api/groups/${group.id}/images`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupInfo.imageInfo)
            })

            if (imgRes.ok) {
                img = await imgRes.json()
            }
        }
        dispatch(updateGroup(group, img, user, events, venues, images))

        return group
    }
}

export const deleteGroup = (user, id) => async (dispatch) => {
    const req = { ...user, ...id }
    const deleteRes = await csrfFetch(`/api/groups/${id}`, {
        method: 'DELETE',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req)
    })

    if (deleteRes.ok) {
        dispatch(removeGroup(id))
        return deleteRes
    }
}

// -Reducer-------------------------

const initialState = { allGroups: {}, singleGroup: {} }

const GroupReducer = (state = initialState, action) => {
    switch (action.type) {
        case GET_GROUPS:
            {
                const newState = { ...state, allGroups: { ...state.allGroups }, singleGroup: { ...state.singleGroup } };
                action.groups.forEach(group => {
                    newState.allGroups[group.id] = { ...group }
                })
                return newState;
            }
        case GET_GROUP:
            {
                const newState = { ...state, allGroups: { ...state.allGroups }, singleGroup: { ...state.singleGroup } }
                newState.singleGroup = { ...action.group }
                newState.singleGroup.Events = {}
                action.events.forEach(event => {
                    newState.singleGroup.Events[event.id] = event
                })
                return newState;
            }
        case POST_GROUP:
            {
                const newState = { ...state };
                // newState.allGroups[action.group.id] = { ...action.group }
                newState.singleGroup = { ...action.group }
                newState.singleGroup.Events = {}
                newState.singleGroup.Venues = [action.venue]
                newState.singleGroup.Organizer = { ...action.user }
                newState.singleGroup.GroupImages = [{ ...action.img }]
                return newState;
            }
        case PUT_GROUP:
            {
                const newState = { ...state };
                newState.singleGroup = { ...action.group }
                newState.singleGroup.Organizer = { ...action.user }
                newState.singleGroup.Events = { ...action.events }
                newState.singleGroup.Venues = { ...action.venues }
                newState.singleGroup.GroupImages = { ...action.images }
                if (action.img) {
                    newState.singleGroup.GroupImages[0] = { ...action.img }
                }
                return newState;
            }
        case DELETE_GROUP:
            {
                const newState = { ...state }
                newState.singleGroup = {}
                delete newState.allGroups[action.id]
                return newState
            }
        default:
            return state;
    }
}

export default GroupReducer
