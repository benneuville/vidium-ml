
export interface VisualizerMessager {
    getMessage(): string;
}

export class VisualizerValidationMessager implements VisualizerMessager {
    videoname: string;
    is_used: boolean;
    constructor(videoname: string) {
        this.videoname = videoname;
        this.is_used = true;
    }

    getMessage(): string {
        if (this.is_used) {
            this.is_used = false;
            return `<footer>
                    <div class="success">Video ${this.videoname} generated successfully</div>
                </footer>`;
        }
        return '';
    }
}

export class VisualizerErrorMessager implements VisualizerMessager {
    videoname: string;
    is_used: boolean;
    constructor(videoname: string) {
        this.videoname = videoname;
        this.is_used = true;
    }

    getMessage(): string {
        if (this.is_used) {
            this.is_used = false;
            return `<footer>
                    <div class="error">Error generating ${this.videoname} video</div>
                </footer>`;
        }
        return '';
    }
}

export class VisualizerInfoPythonMessager implements VisualizerMessager {
    message: string;
    is_used: boolean;
    constructor(message: string) {
        this.message = message;
        this.is_used = true;
    }

    getMessage(): string {
        if (this.is_used) {
            this.is_used = false;
            return `<footer>
                    <div class="infopython">${this.message}</div>
                </footer>`;
        }
        return '';
    }
}