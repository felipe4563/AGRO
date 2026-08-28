import React, { useState } from 'react';

export default function SinPermiso() {
    const [encomiendas, setEncomiendas] = useState([]);

    return (
        <div>
            <h1>Sin Permiso     </h1>
            <p>Lista de encomiendas</p>
        </div>
    );
}