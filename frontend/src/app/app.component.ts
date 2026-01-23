import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss', './../assets/scss/colors.scss', './../assets/scss/buttons.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class AppComponent {}
