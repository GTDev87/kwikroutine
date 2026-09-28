import { Routine } from '../screens/Routine';
import { useGo } from '../navigation';
export default function Route() { return <Routine go={useGo()} />; }
