import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};
export default class ErrorBoundary extends Component<Props,State>{
 state:State={failed:false};
 static getDerivedStateFromError():State{return {failed:true};}
 componentDidCatch(error:Error,info:ErrorInfo){if(import.meta.env.DEV)console.error('JobPilot rendering error',error,info.componentStack);}
 render(){
  if(!this.state.failed)return this.props.children;
  return <main role="alert" style={{maxWidth:560,margin:'12vh auto',padding:32,fontFamily:'system-ui',lineHeight:1.6}}>
    <h1>JobPilot could not display this screen</h1>
    <p>Your saved browser data has not been cleared. Reload the application to try again.</p>
    <button type="button" onClick={()=>window.location.reload()} style={{padding:'12px 18px',cursor:'pointer'}}>Reload JobPilot</button>
  </main>;
 }
}