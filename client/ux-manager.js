class UXManager {

    constructor() {

    }

    applyUXDebuff(debuff, element) {
        let debuffType = debuff.debuffType;
        let duration = debuff.duration;

        // debuff icon
        let debuffIcon = element.querySelector("#debuff-" + debuffType.toLowerCase() );
        debuffIcon.style.display = "block";

        // debuff bar
        let debuffBar = element.querySelector('.debuff-bar');
        debuffBar.classList.add('debuff-' + duration/1000);

        // set the clear of the debuff bar and icon
        window.setTimeout( () => {
            debuffIcon.style.display = "none";
            debuffBar.classList.remove('debuff-' + duration/1000);
        }, duration);
    }

}