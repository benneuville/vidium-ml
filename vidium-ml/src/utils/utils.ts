import { createVidiumMLServices } from '../language-server/vidium-ml-module';
import { NodeFileSystem } from 'langium/node';

export const services = createVidiumMLServices(NodeFileSystem).VidiumML;