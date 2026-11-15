const endpoint = 'https://lecudeiafwhyhufceurv.supabase.co';
const key = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
export const read = name => {
  try { return JSON.parse(localStorage.getItem(name)); } catch { return null; }
};
export const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), n=>n.toString(16).padStart(2,'0')).join('');

export async function joinRoom(code, name) {
  const previous = read('pounce.room');
  const candidate = { code, name, secret:previous?.code === code ? previous.secret : token() };
  const response = await fetch(endpoint+'/functions/v1/pounce-chat', {
    method:'POST', signal:AbortSignal.timeout(12000),
    headers:{'Content-Type':'application/json',apikey:key},
    body:JSON.stringify({op:'join',...candidate}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Could not join the game.');
  try {
    localStorage.setItem('pounce.room',JSON.stringify(candidate));
    localStorage.setItem('pounce.name',JSON.stringify(name));
  } catch {}
  return { ...data, secret: candidate.secret };
}

export function connect(kind, room, handlers) {
  const client = window.supabase.createClient(endpoint,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const sid = token();
  const seatKey = 's'+room.seat;
  const otherKey = 's'+(1-room.seat);
  const channel = client.channel('your-move-mini-v1-'+kind+'-'+room.live,{
    config:{broadcast:{self:false},presence:{key:seatKey}},
  });
  let connected = false, peer = null;
  const send = (event, data) => {
    if (connected) void channel.send({type:'broadcast',event,payload:{sid,...data}}).catch(()=>{});
  };
  channel.on('presence',{event:'sync'},()=>{
    const presence = channel.presenceState()[otherKey]?.at(-1);
    peer = presence?.sid || null;
    handlers.connection(connected,presence?.name);
  });
  for (const event of ['state','move','hello']) {
    channel.on('broadcast',{event},({payload})=>{
      if (payload?.sid === peer && peer) handlers[event](payload);
    });
  }
  channel.subscribe(status=>{
    connected = status === 'SUBSCRIBED';
    handlers.connection(connected);
    if (connected) void channel.track({sid,name:room.names[room.seat] || 'Friend'}).catch(()=>{});
  });
  return {send,close:()=>{void client.removeChannel(channel)}};
}
