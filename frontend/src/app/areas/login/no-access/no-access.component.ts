import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'no-access',
    templateUrl: './no-access.component.html',
    styleUrls: ['./no-access.component.scss'],
    standalone: false
})
export class NoAccessComponent implements OnInit {
    constructor() {}

    ngOnInit(): void {}
}
