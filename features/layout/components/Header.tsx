import React from 'react'
import { useHeaderStore } from '../store/layout.store'
import HeaderMenu from './HeaderMenu'

const Header = () => {

  

  return (
    <div className='flex align-middle justify-between w-full h-17.5 '>
      <div className='pt-2.5 pl-6'>
        <div className='w-24 h-12'>
          <img src="/logo_1.svg" alt="manipal community connect logo" />
        </div>
      </div>
    </div>
  )
}

export default Header